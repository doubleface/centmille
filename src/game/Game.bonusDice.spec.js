import { describe, expect, it } from 'vitest'
import { diceToRoll } from './DiceTurn.js'
import { Game } from './Game.js'

function makeGame(mode = 'dix-mille-bonus') {
  const game = new Game(['Alice', 'Bob'], { mode, rng: () => 0 })
  game.setDiceMode('virtual')
  return game
}
function seed(game, faces) {
  const values = faces.map((face) => (face - 0.5) / 6)
  game.rng = () => (values.length ? values.shift() : 0)
}
function roll(game, faces, options) {
  seed(game, faces)
  game.rollDice(options)
  expect(game.diceTurn.rolls.at(-1)).toEqual(faces)
}
function reload(game) {
  return Game.fromSnapshot(JSON.parse(JSON.stringify(game.getSnapshot())))
}

// Les assertions portent sur les faces, points, mains et sanctions du vrai Game.
describe('cartes et dés Bonus intégrés', () => {
  it.each([
    'cent-mille',
    'dix-mille-bonus',
  ])('%s : vraie reprise1000, nouveau gain100 et second Doubleur donnent2200', (mode) => {
    const game = makeGame(mode)
    game.players[0].hand = ['doubleur']
    game.players[1].hand = ['doubleur']
    game.playCard('doubleur')
    roll(game, [5, 5, 5, 2, 3])
    game.finishDiceTurn()
    expect(game.players[0].score).toBe(1000)
    expect(game.diceCarry.total).toBe(1000)
    game.playCard('doubleur')
    roll(game, [1, 2], { takeOver: true })
    expect(game.diceTurn.total).toBe(1100)
    const turn = structuredClone(game.diceTurn)
    const restored = reload(game)
    const events = restored.finishDiceTurn()
    expect(restored.players[1].score).toBe(2200)
    expect(events).toContainEqual({
      type: 'score',
      player: 'Bob',
      turnScore: 2200,
      cumulative: 2200,
    })
    expect(restored.undoLastEvent().diceTurn).toEqual(turn)
    restored.finishDiceTurn()
    expect(restored.players[0].score).toBe(1000)
    expect(restored.players[1].score).toBe(2200)
  })

  it.each([5, 6])('Reset rend%i dés libres en conservant le cumul, reload et Undo', (count) => {
    const game = makeGame()
    game.players[0].hand = ['sixieme-sens', 'reset']
    if (count === 6) game.playCard('sixieme-sens')
    roll(game, count === 6 ? [5, 5, 5, 1, 2, 3] : [5, 5, 5, 1, 2])
    const before = structuredClone(game.diceTurn)
    expect(before.total).toBe(600)
    game.playCard('reset')
    expect(diceToRoll(game.diceTurn)).toBe(count)
    expect(game.diceTurn.total).toBe(600)
    expect(game.diceTurn.dice.every((die) => die.face === null && !die.kept)).toBe(true)
    expect(reload(game).diceTurn).toEqual(game.diceTurn)
    expect(game.undoLastEvent().diceTurn).toEqual(before)
    expect(game.players[0].hand).toContain('reset')
    game.playCard('reset')
    roll(game, Array(count).fill(1))
    expect(game.diceTurn.total).toBe(count === 6 ? 8600 : 4600)
    expect(() => game.undoLastEvent()).toThrow(/lancer/)
    expect(reload(game).diceTurn).toEqual(game.diceTurn)
  })

  it('annonce Sixième Sens avant le lancer et adapte la reprise5 vers6 à trois dés libres', () => {
    const game = makeGame()
    game.players[1].hand = ['sixieme-sens']
    roll(game, [5, 5, 5, 2, 3])
    game.finishDiceTurn()
    game.playCard('sixieme-sens')
    roll(game, [1, 2, 3], { takeOver: true })
    expect(game.diceTurn.diceCount).toBe(6)
    expect(game.diceTurn.total).toBe(600)
    expect(diceToRoll(game.diceTurn)).toBe(2)
    expect(reload(game).diceTurn).toEqual(game.diceTurn)
    game.players[1].hand.push('sixieme-sens')
    const before = game.getSnapshot()
    expect(() => game.playCard('sixieme-sens')).toThrow(/avant le premier/)
    expect(game.getSnapshot()).toEqual(before)
  })

  it('cinq gardés sur six remplissent la main du repreneur5 : relance5 et cumul4000 conservé', () => {
    const game = makeGame()
    game.players[0].hand = ['sixieme-sens']
    game.playCard('sixieme-sens')
    roll(game, [1, 1, 1, 1, 1, 2])
    expect(diceToRoll(game.diceTurn)).toBe(1)
    game.finishDiceTurn()
    roll(game, [1, 2, 2, 3, 6], { takeOver: true })
    expect(game.diceTurn.diceCount).toBe(5)
    expect(game.diceTurn.total).toBe(4100)
    expect(game.diceTurn.dice.filter((die) => die.kept)).toHaveLength(1)
    expect(reload(game).diceTurn).toEqual(game.diceTurn)
  })

  it('Aspirateur reprend réellement400 et trois dés échoués, avant ouverture et avec lancer obligatoire', () => {
    const game = makeGame()
    game.players[0].validateTurn(500)
    game.players[0].hand = ['doubleur', 'aspirateur']
    game.playCard('doubleur')
    roll(game, [1, 1, 2, 3, 6])
    game.finishDiceTurn()
    expect(game.diceCarry.total).toBe(400)
    roll(game, [2, 3, 4], { takeOver: true })
    expect(game.diceTurn.lost).toBe(400)
    game.finishDiceTurn()
    expect(game.diceBustCarry.failedFaces).toEqual([2, 3, 4])
    const restored = reload(game)
    restored.playCard('aspirateur')
    expect(restored.diceTurn.total).toBe(400)
    expect(restored.diceTurn.dice.filter((die) => !die.kept).map((die) => die.face)).toEqual([
      2, 3, 4,
    ])
    expect(diceToRoll(restored.diceTurn)).toBe(3)
    expect(() => restored.finishDiceTurn()).toThrow(/Lancez/)
    expect(reload(restored).diceTurn).toEqual(restored.diceTurn)
    const undone = restored.undoLastEvent()
    expect(undone.diceTurn.total).toBe(0)
    expect(undone.diceBustCarry.total).toBe(400)
    expect(undone.players[0].hand).toContain('aspirateur')
    restored.playCard('aspirateur')
    roll(restored, [1, 2, 3])
    expect(restored.diceTurn.total).toBe(500)
    restored.finishDiceTurn()
    expect(restored.players[0].score).toBe(1400)
    expect(restored.players[1].score).toBe(0)
  })

  it.each([
    false,
    true,
  ])('Aspirateur adapte une broucouille après main pleine, Sixième=%s', (six) => {
    const game = makeGame()
    game.players[1].hand = ['aspirateur', 'sixieme-sens']
    roll(game, [2, 3, 4, 5, 6])
    roll(game, [2, 2, 3, 4, 6])
    game.finishDiceTurn()
    if (six) game.playCard('sixieme-sens')
    game.playCard('aspirateur')
    expect(game.diceTurn.total).toBe(1500)
    expect(diceToRoll(game.diceTurn)).toBe(six ? 6 : 5)
    expect(game.diceTurn.dice.filter((die) => die.kept)).toHaveLength(0)
    expect(reload(game).diceTurn).toEqual(game.diceTurn)
  })

  it.each([
    0, 150,
  ])('Aspirateur accepte le pré-cumul%i même nul ou hors centaine, mais pas l’arrêt immédiat', (total) => {
    const game = makeGame()
    game.players[1].hand = ['aspirateur']
    if (total) roll(game, [1, 5, 2, 3, 6])
    roll(game, total ? [2, 3, 4] : [2, 2, 3, 4, 6])
    game.finishDiceTurn()
    game.playCard('aspirateur')
    expect(game.diceTurn.total).toBe(total)
    expect(() => game.finishDiceTurn()).toThrow(/Lancez/)
    expect(reload(game).diceTurn).toEqual(game.diceTurn)
  })

  it('Caméléon recalcule les dés tout juste gardés, sans additionner deux fois leur gain', () => {
    const game = makeGame()
    game.players[0].hand = ['cameleon']
    roll(game, [1, 1, 5, 2, 3])
    const before = structuredClone(game.diceTurn)
    game.playCard('cameleon', { dieIndex: 2, face: 1 })
    expect(game.diceTurn.total).toBe(1000)
    expect(game.diceTurn.lastResult.points).toBe(1000)
    expect(game.diceTurn.rolls).toEqual([[1, 1, 1, 2, 3]])
    expect(game.diceTurn.dice.filter((die) => die.kept).map((die) => die.face)).toEqual([1, 1, 1])
    expect(reload(game).diceTurn).toEqual(game.diceTurn)
    expect(game.undoLastEvent().diceTurn).toEqual(before)
    expect(game.players[0].hand).toEqual(['cameleon'])
  })

  it('Caméléon exclut une ancienne réserve mais permet le brelan du dernier lancer entier', () => {
    const game = makeGame()
    game.players[0].hand = ['cameleon']
    roll(game, [1, 2, 2, 3, 6])
    roll(game, [1, 1, 2, 3])
    const before = game.getSnapshot()
    expect(() => game.playCard('cameleon', { dieIndex: 0, face: 5 })).toThrow(/ancienne réserve/)
    expect(game.getSnapshot()).toEqual(before)
    game.playCard('cameleon', { dieIndex: 3, face: 1 })
    expect(game.diceTurn.total).toBe(1100)
    expect(game.diceTurn.lastResult.points).toBe(1000)
    expect(game.diceTurn.dice[0]).toEqual({ face: 1, kept: true })
    expect(reload(game).diceTurn).toEqual(game.diceTurn)
  })

  it('Convertisseur ne touche pas les marquants, sauve la broucouille et laisse un cumul50 non validable', () => {
    const game = makeGame()
    game.players[0].hand = ['convertisseur']
    roll(game, [1, 2, 2, 3, 6])
    expect(() => game.playCard('convertisseur', { dieIndex: 0 })).toThrow(/non marquant/)
    roll(game, [2, 3, 4, 6])
    expect(game.diceTurn.phase).toBe('bust')
    game.playCard('convertisseur', { dieIndex: 1 })
    expect(game.diceTurn.phase).toBe('playing')
    expect(game.diceTurn.total).toBe(150)
    expect(game.diceTurn.dice[0]).toEqual({ face: 1, kept: true })
    expect(game.diceTurn.dice[1]).toEqual({ face: 5, kept: true })
    expect(game.diceTurn.lastResult.points).toBe(50)
    expect(() => game.finishDiceTurn()).toThrow(/multiple/)
    expect(reload(game).diceTurn).toEqual(game.diceTurn)
  })

  it('Petite Suite remplace tout le gain du lancer mais ne fusionne pas les réserves antérieures', () => {
    const game = makeGame()
    game.players[0].hand = ['petite-suite']
    roll(game, [1, 2, 2, 3, 6])
    roll(game, [2, 3, 4, 5])
    expect(game.diceTurn.total).toBe(150)
    game.playCard('petite-suite')
    expect(game.diceTurn.total).toBe(1100)
    expect(game.diceTurn.lastResult.points).toBe(1000)
    expect(game.diceTurn.dice.every((die) => die.kept)).toBe(true)
    expect(reload(game).diceTurn).toEqual(game.diceTurn)
    const before = structuredClone(game.diceTurn)
    game.finishDiceTurn()
    expect(game.players[0].score).toBe(1100)
    expect(game.undoLastEvent().diceTurn).toEqual(before)
  })

  it('Seconde Chance relance seulement les dés échoués, ne sanctionne pas, reload et Undo sans hasard', () => {
    const game = makeGame()
    game.players[0].hand = ['seconde-chance']
    roll(game, [5, 5, 5, 2, 3])
    roll(game, [2, 3])
    const bust = structuredClone(game.diceTurn)
    seed(game, [1, 2])
    game.playCard('seconde-chance')
    expect(game.diceTurn.total).toBe(600)
    expect(game.diceTurn.dice.slice(0, 3)).toEqual(bust.dice.slice(0, 3))
    expect(game.diceTurn.rolls).toEqual([
      [5, 5, 5, 2, 3],
      [1, 2],
    ])
    expect(game.players[0].failedTurnsInRow).toBe(0)
    expect(reload(game).diceTurn).toEqual(game.diceTurn)
    expect(game.undoLastEvent().diceTurn).toEqual(bust)
    expect(game.players[0].hand).toContain('seconde-chance')
  })

  it('Écho applique vraiment la modification du dernier lancer et reste annulable', () => {
    const game = makeGame()
    game.players[0].hand = ['convertisseur', 'echo']
    roll(game, [1, 2, 2, 3, 6])
    game.playCard('convertisseur', { dieIndex: 1 })
    game.playCard('echo', { dieIndex: 2 })
    expect(game.diceTurn.total).toBe(200)
    expect(game.diceTurn.dice.slice(0, 3).map((die) => die.face)).toEqual([1, 5, 5])
    expect(reload(game).diceTurn).toEqual(game.diceTurn)
    game.undoLastEvent()
    expect(game.diceTurn.total).toBe(150)
    expect(game.players[0].hand).toEqual(['echo'])
  })

  it.each([
    'contrat',
    'tout-ou-rien',
  ])('%s applique réellement l’échec et Undo atomique, sans impasse du mode virtuel', (card) => {
    const game = makeGame()
    game.players[0].validateTurn(500)
    game.players[0].hand = [card]
    game.playCard(card, { targetScore: 600 })
    roll(game, [5, 5, 5, 2, 3])
    const turn = structuredClone(game.diceTurn)
    const events = game.finishDiceTurn()
    expect(events).toContainEqual({ type: 'bust', player: 'Alice' })
    expect(game.players[0].failedTurnsInRow).toBe(card === 'tout-ou-rien' ? 2 : 1)
    expect(game.currentPlayerIndex).toBe(1)
    expect(game.diceCarry).toBeNull()
    expect(game.undoLastEvent().diceTurn).toEqual(turn)
    expect(game.players[0].failedTurnsInRow).toBe(0)
  })

  it.each([
    [[1, 1, 5, 2, 3], ['arrondi', 'doubleur'], {}, 600],
    [[5, 5, 5, 1, 2], ['contrat', 'doubleur'], { targetScore: 600 }, 2400],
    [[1, 1, 1, 2, 3], ['tout-ou-rien', 'doubleur'], {}, 6000],
  ])('le vrai tour virtuel applique %j / %j une seule fois, garde le montant validé et restaure ses cartes', (faces, cards, payload, expected) => {
    const game = makeGame()
    game.players[0].hand = [...cards]
    for (const card of cards) game.playCard(card, payload)
    roll(game, faces)
    const before = game.getSnapshot()
    game.finishDiceTurn()
    expect(game.players[0].score).toBe(expected)
    expect(game.diceCarry.total).toBe(expected)
    const restored = reload(game)
    expect(restored.diceCarry).toEqual(game.diceCarry)
    expect(game.undoLastEvent().diceTurn).toEqual(before.diceTurn)
    expect(game.activeTurnModifiers).toEqual(before.activeTurnModifiers)
    expect(game.players[0].score).toBe(0)
  })

  it('la Malédiction échoue réellement sous500 et Undo restaure son statut avec les dés', () => {
    const game = makeGame()
    game.players[0].validateTurn(500)
    game.players[0].status.cursed = true
    roll(game, [1, 1, 2, 3, 6])
    const before = game.getSnapshot()
    game.finishDiceTurn()
    expect(game.players[0].failedTurnsInRow).toBe(1)
    expect(game.players[0].status.cursed).toBe(false)
    expect(game.undoLastEvent().diceTurn).toEqual(before.diceTurn)
    expect(game.players[0].status.cursed).toBe(true)
  })

  it('Assurance peut ouvrir à1000 sans offrir les dés échoués à une reprise ordinaire', () => {
    const game = makeGame()
    game.players[0].hand = ['assurance']
    game.playCard('assurance')
    roll(game, [1, 1, 1, 1, 2])
    roll(game, [2])
    const before = game.getSnapshot()
    game.finishDiceTurn()
    expect(game.players[0].score).toBe(1000)
    expect(game.players[0].hasOpened).toBe(true)
    expect(game.diceCarry).toBeNull()
    expect(game.diceBustCarry).toBeNull()
    expect(reload(game).players[0].score).toBe(1000)
    expect(game.undoLastEvent().diceTurn).toEqual(before.diceTurn)
    expect(game.players[0].hasOpened).toBe(false)
    expect(game.activeTurnModifiers.assurance).toBe(true)
  })

  it('Aspirateur passe de cinq à six sans inventer la face du dé supplémentaire', () => {
    const game = makeGame()
    game.players[1].hand = ['sixieme-sens', 'aspirateur']
    roll(game, [5, 5, 5, 2, 3])
    roll(game, [2, 3])
    game.finishDiceTurn()
    game.playCard('sixieme-sens')
    game.playCard('aspirateur')
    expect(game.diceTurn.total).toBe(500)
    expect(game.diceTurn.dice.filter((die) => !die.kept).map((die) => die.face)).toEqual([
      2,
      3,
      null,
    ])
    expect(diceToRoll(game.diceTurn)).toBe(3)
    expect(reload(game).diceTurn).toEqual(game.diceTurn)
    roll(game, [1, 2, 3])
    expect(game.diceTurn.total).toBe(600)
  })

  it.each([
    'doubleur',
    'tout-ou-rien',
    'contrat',
    'assurance',
    'sixieme-sens',
    'aspirateur',
  ])('refuse %s tardive sans consommer la carte ni modifier le tour', (card) => {
    const game = makeGame()
    game.players[0].hand = [card]
    roll(game, [5, 5, 5, 2, 3])
    const before = game.getSnapshot()
    expect(() => game.playCard(card, { targetScore: 500 })).toThrow()
    expect(game.getSnapshot()).toEqual(before)
  })

  it.each([
    ['reset', {}, null, /entre deux/],
    ['seconde-chance', {}, [5, 5, 5, 2, 3], /broucouille/],
    ['cameleon', { dieIndex: 0, face: 1 }, null, /lancer visible/],
    ['cameleon', { dieIndex: 0, face: 7 }, [5, 5, 5, 2, 3], /face de 1 à 6/],
    ['cameleon', { dieIndex: 9, face: 1 }, [5, 5, 5, 2, 3], /ancienne réserve/],
    ['petite-suite', {}, [5, 5, 5, 2, 3], /suite de quatre/],
    ['convertisseur', { dieIndex: 0 }, [5, 5, 5, 2, 3], /non marquant/],
  ])('refuse %s et son payload invalide atomiquement', (card, payload, faces, error) => {
    const game = makeGame()
    game.players[0].hand = [card]
    if (faces) roll(game, faces)
    const before = game.getSnapshot()
    expect(() => game.playCard(card, payload)).toThrow(error)
    expect(game.getSnapshot()).toEqual(before)
    expect(reload(game).diceTurn).toEqual(game.diceTurn)
  })

  it('refuse une reprise Aspirateur sans faces virtuelles précédentes, sans inventer celles du jeu physique', () => {
    const game = new Game(['Alice', 'Bob'], { mode: 'dix-mille-bonus', rng: () => 0 })
    game.players[1].hand = ['aspirateur']
    game.recordBust()
    game.setDiceMode('virtual')
    const before = game.getSnapshot()
    expect(() => game.playCard('aspirateur')).toThrow(/broucouille virtuelle/)
    expect(game.getSnapshot()).toEqual(before)
  })

  it.each([
    ['happy-hour', [5, 2, 2, 3, 6], 100],
    ['happy-hour', [5, 5, 5, 2, 3], 500],
    ['happy-hour', [1, 2, 3, 4, 5], 1500],
    ['tour-eclair', [1, 2, 2, 3, 6], 200],
    ['tour-eclair', [1, 1, 1, 2, 3], 1000],
    ['tour-eclair', [1, 2, 3, 4, 5], 1500],
    ['fete-des-2', [2, 2, 2, 3, 6], 2000],
    ['fete-des-2', [2, 2, 2, 2, 3], 4000],
    ['fete-des-2', [2, 2, 2, 2, 2], 8000],
    ['fete-des-2', [2, 2, 2, 2, 2, 2], 16000],
  ])('%s / %j : vrai barème%i, persistance, score et Undo', (id, faces, points) => {
    const game = makeGame('cent-mille')
    game.players[0].validateTurn(500)
    if (faces.length === 6) {
      game.players[0].hand = ['sixieme-sens']
      game.playCard('sixieme-sens')
    }
    game.activeTableEvent = { id, remainingTurns: 2 }
    roll(game, faces)
    expect(game.diceTurn.total).toBe(points)
    const before = game.getSnapshot()
    const restored = reload(game)
    expect(restored.diceTurn).toEqual(game.diceTurn)
    restored.finishDiceTurn()
    expect(restored.players[0].score).toBe(500 + points)
    expect(restored.activeTableEvent.remainingTurns).toBe(1)
    expect(restored.undoLastEvent().diceTurn).toEqual(before.diceTurn)
    expect(restored.activeTableEvent.remainingTurns).toBe(2)
  })

  it.each([
    1, 5,
  ])('Aimant%i par main : regroupe sans réadditionner, puis main pleine repart de zéro', (face) => {
    const game = makeGame('cent-mille')
    game.players[0].hand = ['aimant', 'sixieme-sens']
    game.playCard('aimant', { face })
    game.playCard('sixieme-sens')
    roll(game, [face, face, 2, 2, 3, 6])
    expect(game.diceTurn.total).toBe(face === 1 ? 200 : 100)
    for (const [free, expected] of [
      [4, 1000],
      [3, 2000],
      [2, 4000],
      [1, 8000],
    ]) {
      const faces = [face, ...[2, 3, 6].slice(0, free - 1)]
      roll(game, faces)
      expect(game.diceTurn.total).toBe(face === 1 ? expected : expected / 2)
      expect(reload(game).diceTurn).toEqual(game.diceTurn)
    }
    expect(diceToRoll(game.diceTurn)).toBe(6)
    roll(game, [face, 2, 2, 3, 3, 6])
    expect(game.diceTurn.magnetCounts[face]).toBe(1)
    expect(game.diceTurn.lastResult.points).toBe(face === 1 ? 100 : 50)
    expect(game.diceTurn.total).toBe(face === 1 ? 8100 : 4050)
  })

  it.each([
    ['happy-hour', 5, 200, 500],
    ['tour-eclair', 1, 400, 1000],
  ])('Aimant et %s : les isolés sont remplacés par le groupe normal', (id, face, isolated, total) => {
    const game = makeGame()
    game.players[0].hand = ['aimant']
    game.playCard('aimant', { face })
    game.activeTableEvent = { id, remainingTurns: 2 }
    roll(game, [face, face, 2, 3, 6])
    expect(game.diceTurn.total).toBe(isolated)
    roll(game, [face, 2, 3])
    expect(game.diceTurn.total).toBe(total)
    expect(game.diceTurn.lastResult.points).toBe(total - isolated)
    const before = game.getSnapshot()
    game.finishDiceTurn()
    expect(game.players[0].score).toBe(total)
    expect(game.undoLastEvent().diceTurn).toEqual(before.diceTurn)
  })

  it('Reset efface le regroupement, pas le cumul acquis ; anciennes suites jamais comptées deux fois', () => {
    const game = makeGame()
    game.players[0].hand = ['aimant', 'reset', 'petite-suite']
    game.playCard('aimant', { face: 1 })
    roll(game, [1, 1, 2, 3, 6])
    game.playCard('reset')
    roll(game, [1, 2, 3, 4, 6])
    expect(game.diceTurn.total).toBe(300)
    game.playCard('petite-suite')
    expect(game.diceTurn.total).toBe(1200)
    expect(game.diceTurn.magnetCounts[1]).toBe(0)
    roll(game, [1])
    expect(game.diceTurn.total).toBe(1300)
    expect(reload(game).diceTurn).toEqual(game.diceTurn)
  })

  it('Aimant reprend un montant effectif avec sa réserve : gain marginal seul puis score réel', () => {
    const game = makeGame()
    game.players[0].validateTurn(500)
    game.players[0].hand = ['doubleur']
    game.players[1].hand = ['aimant']
    game.playCard('doubleur')
    roll(game, [1, 1, 2, 3, 6])
    game.finishDiceTurn()
    expect(game.diceCarry.total).toBe(400)
    game.playCard('aimant', { face: 1 })
    roll(game, [1, 2, 3], { takeOver: true })
    expect(game.diceTurn.total).toBe(1200)
    expect(game.diceTurn.lastResult.points).toBe(800)
    const restored = reload(game)
    restored.finishDiceTurn()
    expect(restored.players[1].score).toBe(1200)
  })

  it('Caméléon puis Convertisseur recalculent le gain Aimant entier, sans toucher aux anciennes réserves', () => {
    const game = makeGame()
    game.players[0].hand = ['aimant', 'cameleon', 'convertisseur']
    game.playCard('aimant', { face: 1 })
    roll(game, [1, 1, 2, 3, 6])
    roll(game, [1, 2, 3])
    expect(game.diceTurn.total).toBe(1000)
    game.playCard('cameleon', { dieIndex: 2, face: 5 })
    expect(game.diceTurn.total).toBe(250)
    expect(game.diceTurn.magnetCounts).toEqual({ 1: 2, 5: 1 })
    // Convertisseur produit un5, pas un1 : deux5 et la réserve de deux1 restent distincts.
    game.playCard('convertisseur', { dieIndex: 3 })
    expect(game.diceTurn.total).toBe(300)
    expect(game.diceTurn.magnetCounts).toEqual({ 1: 2, 5: 2 })
    expect(reload(game).diceTurn).toEqual(game.diceTurn)
    game.undoLastEvent()
    expect(game.diceTurn.total).toBe(250)
  })

  it('Petite Suite peut surpasser le gain Aimant sans réutiliser ses dés pour le groupe', () => {
    const game = makeGame('cent-mille')
    game.players[0].hand = ['aimant', 'sixieme-sens', 'petite-suite']
    game.playCard('aimant', { face: 1 })
    game.playCard('sixieme-sens')
    roll(game, [1, 1, 2, 2, 3, 6])
    roll(game, [1, 2, 3, 4])
    expect(game.diceTurn.total).toBe(1000)
    game.playCard('petite-suite')
    expect(game.diceTurn.total).toBe(1200)
    expect(game.diceTurn.magnetCounts[1]).toBe(2)
    expect(diceToRoll(game.diceTurn)).toBe(6)
    expect(reload(game).diceTurn).toEqual(game.diceTurn)
    roll(game, [1, 2, 2, 3, 3, 6])
    expect(game.diceTurn.total).toBe(1300)
    expect(game.diceTurn.magnetCounts[1]).toBe(1)
  })

  it('Seconde Chance rejoue avec Aimant et Tour éclair, recharge et Undo reprennent la vraie broucouille', () => {
    const game = makeGame()
    game.players[0].hand = ['aimant', 'seconde-chance']
    game.playCard('aimant', { face: 1 })
    game.activeTableEvent = { id: 'tour-eclair', remainingTurns: 2 }
    roll(game, [1, 1, 2, 3, 6])
    roll(game, [2, 3, 6])
    const failed = game.getSnapshot()
    seed(game, [1, 2, 3])
    game.playCard('seconde-chance')
    expect(game.diceTurn.total).toBe(1000)
    expect(game.diceTurn.lastResult.points).toBe(600)
    expect(reload(game).diceTurn).toEqual(game.diceTurn)
    game.undoLastEvent()
    expect(game.diceTurn).toEqual(failed.diceTurn)
    expect(game.players[0].hand).toEqual(['seconde-chance'])
  })

  it('valide le choix Aimant et son Écho avant consommation, et conserve les anciens tours physiques', () => {
    const game = makeGame()
    game.players[0].hand = ['aimant', 'echo']
    for (const face of [undefined, 2]) {
      const before = game.getSnapshot()
      expect(() => game.playCard('aimant', { face })).toThrow(/face 1 ou 5/)
      expect(game.getSnapshot()).toEqual(before)
    }
    game.setDiceMode('physical')
    game.playCard('aimant', { face: 5 })
    game.setDiceMode('virtual')
    expect(game.activeTurnModifiers.aimantFace).toBe(5)
    const before = game.getSnapshot()
    expect(() => game.playCard('echo', { face: 3 })).toThrow(/face 1 ou 5/)
    expect(game.getSnapshot()).toEqual(before)
    game.playCard('echo', { face: 1 })
    expect(game.activeTurnModifiers.aimantFace).toBe(1)
    expect(game.activeTurnModifiers.declarativeCards).toEqual(['aimant'])
    expect(reload(game).activeTurnModifiers.aimantFace).toBe(1)
    game.undoLastEvent()
    expect(game.activeTurnModifiers.aimantFace).toBe(5)
    roll(game, [5, 2, 2, 3, 6])
    const rolled = game.getSnapshot()
    expect(() => game.playCard('echo', { face: 1 })).toThrow(/avant le premier/)
    expect(game.getSnapshot()).toEqual(rolled)
    const legacy = new Game(['Alice', 'Bob'], { mode: 'dix-mille-bonus' })
    legacy.activeTurnModifiers.declarativeCards.push('aimant')
    expect(() => legacy.setDiceMode('virtual')).toThrow(/Ancien Aimant/)
    legacy.recordTurn(500)
    expect(legacy.players[0].score).toBe(500)
  })

  it('aucune carte ne débloque une relance après dépassement, confirmation et Undo restent réels', () => {
    const game = makeGame()
    game.players[0].validateTurn(9000)
    game.players[0].hand = ['cameleon']
    roll(game, [1, 1, 1, 1, 2])
    const before = game.getSnapshot()
    expect(() => game.playCard('cameleon', { dieIndex: 0, face: 5 })).toThrow(/cible est dépassée/)
    expect(game.getSnapshot()).toEqual(before)
    expect(() => game.rollDice()).toThrow(/cible est dépassée/)
    game.finishDiceTurn()
    expect(game.players[0].failedTurnsInRow).toBe(1)
    expect(game.currentPlayerIndex).toBe(1)
    expect(game.undoLastEvent().diceTurn).toEqual(before.diceTurn)
  })

  it.each([
    [[1, 2, 2, 3, 4], 100],
    [[1, 1, 2, 3, 4], 200],
  ])('R9 : Aspirateur après main pleine remet Aimant à zéro pour %j, reload et Undo', (faces, gain) => {
    const game = makeGame('cent-mille')
    game.players[1].hand = ['aimant', 'aspirateur']
    roll(game, [1, 1, 1, 1, 1])
    roll(game, [2, 2, 3, 4, 6])
    game.rng = () => 0.99
    game.finishDiceTurn()
    game.playCard('aimant', { face: 1 })
    game.playCard('aspirateur')
    const inherited = structuredClone(game.diceTurn)
    expect(inherited.total).toBe(4000)
    expect(inherited.magnetCounts).toEqual({ 1: 0, 5: 0 })
    expect(diceToRoll(inherited)).toBe(5)
    expect(reload(game).diceTurn).toEqual(inherited)
    expect(game.undoLastEvent().diceTurn.total).toBe(0)
    expect(game.players[1].hand).toEqual(['aspirateur'])
    game.playCard('aspirateur')
    const restored = reload(game)
    roll(restored, faces)
    expect(restored.diceTurn.lastResult.points).toBe(gain)
    expect(restored.diceTurn.total).toBe(4000 + gain)
    expect(restored.diceTurn.magnetCounts[1]).toBe(gain / 100)
    const changed = structuredClone(restored.diceTurn)
    expect(reload(restored).diceTurn).toEqual(changed)
    restored.rng = () => 0.99
    restored.finishDiceTurn()
    expect(restored.players[1].score).toBe(4000 + gain)
    expect(restored.players[0].score).toBe(0)
    expect(restored.undoLastEvent().diceTurn).toEqual(changed)
    expect(restored.players[1].score).toBe(0)
    restored.finishDiceTurn()
    expect(restored.players[1].score).toBe(4000 + gain)
  })

  it('R8 : refuse Aspirateur en dépassement avant consommation, recharge et vrai nouveau lancer', () => {
    const game = makeGame('cent-mille')
    game.players[1].validateTurn(99700)
    game.players[1].hand = ['aspirateur']
    roll(game, [1, 1, 1, 2, 3])
    roll(game, [2, 3])
    game.rng = () => 0.99
    game.finishDiceTurn()
    const before = game.getSnapshot()
    expect(() => game.playCard('aspirateur')).toThrow(/carte.*dépasserait/)
    expect(game.getSnapshot()).toEqual(before)
    const restored = reload(game)
    expect(restored.players[1].hand).toEqual(['aspirateur'])
    expect(restored.diceTurn.total).toBe(0)
    expect(() => restored.finishDiceTurn()).toThrow(/Lancez/)
    roll(restored, [1, 2, 2, 3, 6])
    restored.rng = () => 0.99
    restored.finishDiceTurn()
    expect(restored.players[1].score).toBe(99800)
    expect(restored.players[1].failedTurnsInRow).toBe(0)
  })

  it('R8 : Aspirateur à la cible exacte reste permis mais exige toujours un lancer', () => {
    const game = makeGame('cent-mille')
    game.players[1].validateTurn(99000)
    game.players[1].hand = ['aspirateur']
    roll(game, [1, 1, 1, 2, 3])
    roll(game, [2, 3])
    game.rng = () => 0.99
    game.finishDiceTurn()
    game.playCard('aspirateur')
    const restored = reload(game)
    expect(restored.diceTurn.total).toBe(1000)
    expect(restored.winner).toBeNull()
    expect(() => restored.finishDiceTurn()).toThrow(/Lancez/)
    roll(restored, [2, 3])
    expect(restored.diceTurn.phase).toBe('bust')
    restored.rng = () => 0.99
    restored.finishDiceTurn()
    expect(restored.players[1].score).toBe(99000)
    expect(restored.players[1].failedTurnsInRow).toBe(1)
    expect(restored.currentPlayerIndex).toBe(0)
  })

  it.each([
    ['doubleur', 1500],
    ['contrat', 1500],
    ['tout-ou-rien', 2500],
  ])('R8 : refuse %s après Aspirateur sans créer d’impasse ready, reload et lancer obligatoire', (card, margin) => {
    const game = makeGame('cent-mille')
    game.players[1].validateTurn(100000 - margin)
    game.players[1].hand = ['aspirateur', card]
    roll(game, [1, 1, 1, 2, 3])
    roll(game, [2, 3])
    game.rng = () => 0.99
    game.finishDiceTurn()
    game.playCard('aspirateur')
    const before = game.getSnapshot()
    expect(() => game.playCard(card, { targetScore: 1000 })).toThrow(/carte.*dépasserait/)
    expect(game.getSnapshot()).toEqual(before)
    const restored = reload(game)
    expect(restored.players[1].hand).toEqual([card])
    expect(restored.diceTurn.phase).toBe('ready')
    expect(restored.diceTurn.total).toBe(1000)
    expect(() => restored.finishDiceTurn()).toThrow(/Lancez/)
    roll(restored, [1, 2])
    expect(restored.diceTurn.total).toBe(1100)
    restored.rng = () => 0.99
    restored.finishDiceTurn()
    expect(restored.players[1].score).toBe(101100 - margin)
    expect(restored.players[1].failedTurnsInRow).toBe(0)
  })

  it('bloque le hasard tant qu’une vraie distribution de carte attend un choix', () => {
    const game = makeGame()
    game.players[0].hand = ['reset', 'cameleon']
    game.giveCardToPlayer(0, 'doubleur')
    expect(game.pendingInteractions[0].type).toBe('hand-overflow')
    const before = game.getSnapshot()
    expect(() => game.rollDice()).toThrow(/confirmations/)
    expect(game.getSnapshot()).toEqual(before)
    game.resolveHandOverflow('reset')
    roll(game, [5, 5, 5, 2, 3])
    expect(game.diceTurn.total).toBe(500)
  })

  it.each([
    false,
    true,
  ])('Assurance sauve300 d’un cumul600 ou laisse confirmer si ouverture impossible, déjà ouvert=%s', (opened) => {
    const game = makeGame()
    if (opened) game.players[0].validateTurn(500)
    game.players[0].hand = ['assurance']
    game.playCard('assurance')
    roll(game, opened ? [5, 5, 5, 1, 2] : [1, 1, 2, 3, 6])
    roll(game, opened ? [2] : [2, 3, 4])
    const before = structuredClone(game.diceTurn)
    game.finishDiceTurn()
    expect(game.players[0].score).toBe(opened ? 800 : 0)
    expect(game.players[0].failedTurnsInRow).toBe(opened ? 0 : 1)
    expect(game.diceCarry).toBeNull()
    expect(game.undoLastEvent().diceTurn).toEqual(before)
    expect(game.activeTurnModifiers.assurance).toBe(true)
  })
})
