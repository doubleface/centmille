import { describe, expect, it } from 'vitest'
import { Game } from './Game.js'

function makeGame(rolls, options = {}) {
  const values = rolls.flat().map((face) => (face - 0.5) / 6)
  const game = new Game(['Alice', 'Bob'], { ...options, rng: () => values.shift() })
  game.setDiceMode('virtual')
  return game
}

describe('dés intégrés au vrai Game', () => {
  it('reste physique par défaut et ouvre à 500 avec un unique événement de score', () => {
    const physical = new Game(['Alice', 'Bob'])
    expect(physical.diceMode).toBe('physical')
    expect(() => physical.rollDice()).toThrow(/Activez/)
    expect(() => physical.finishDiceTurn()).toThrow(/Activez/)
    expect(() => physical.setDiceMode('invalid')).toThrow(/invalide/)
    const game = makeGame([
      [1, 5, 2, 3, 6],
      [2, 2, 2],
      [1, 5, 2, 3, 6],
    ])
    expect(() => game.finishDiceTurn()).toThrow(/Lancez/)
    game.rollDice()
    expect(game.diceTurn.total).toBe(150)
    expect(() => game.finishDiceTurn()).toThrow(/multiple/)
    expect(() => game.recordTurn(500)).toThrow(/multiple/)
    expect(() => game.recordBust()).toThrow(/broucouille/)
    expect(() => game.setDiceMode('physical')).toThrow(/Terminez/)
    expect(() => game.undoLastEvent()).toThrow(/lancer/)
    game.rollDice()
    expect(game.diceTurn.total).toBe(350)
    expect(game.diceTurn.dice.every((die) => die.kept)).toBe(true)
    game.rollDice()
    expect(game.diceTurn.total).toBe(500)
    expect(() => game.recordTurn(600)).toThrow(/cumul calculé/)
    const events = game.finishDiceTurn()
    expect(events).toEqual([{ type: 'score', player: 'Alice', turnScore: 500, cumulative: 500 }])
    expect(game.players[0].hasOpened).toBe(true)
    expect(game.currentPlayerIndex).toBe(1)
    expect(game.diceTurn.phase).toBe('ready')
    expect(game.events).toHaveLength(1)
    expect(() => game.finishDiceTurn()).toThrow(/Lancez/)
    game.setDiceMode('physical')
    expect(game.diceTurn).toBeNull()
    game.recordTurn(600)
    expect(game.players[1].score).toBe(600)
  })

  it('restaure le résultat exact au rechargement et à l’annulation, sans relancer', () => {
    const game = makeGame([[5, 5, 5, 2, 3]])
    game.rollDice()
    const before = game.getSnapshot()
    const restored = Game.fromSnapshot(JSON.parse(JSON.stringify(before)))
    expect(restored.getSnapshot()).toEqual(before)
    before.diceTurn.dice[0].face = 2
    expect(game.diceTurn.dice[0].face).toBe(5)
    game.finishDiceTurn()
    const undone = game.undoLastEvent()
    expect(undone.currentPlayerIndex).toBe(0)
    expect(undone.players[0].score).toBe(0)
    expect(undone.diceTurn).toEqual(restored.diceTurn)
    expect(game.events).toEqual([])
    game.finishDiceTurn()
    expect(game.players[0].score).toBe(500)
    expect(game.events).toHaveLength(1)
    const legacy = new Game(['Alice', 'Bob']).getSnapshot()
    delete legacy.diceMode
    delete legacy.diceTurn
    expect(Game.fromSnapshot(legacy).diceMode).toBe('physical')
  })

  it('conserve une broucouille visible et applique la vraie sanction au troisième échec', () => {
    const game = makeGame([[2, 2, 3, 4, 6]])
    game.players[0].validateTurn(500)
    game.players[0].validateTurn(500)
    game.players[0].failedTurnsInRow = 2
    game.rollDice()
    expect(game.currentPlayerIndex).toBe(0)
    expect(game.players[0].score).toBe(1000)
    expect(game.diceTurn.phase).toBe('bust')
    const restored = Game.fromSnapshot(game.getSnapshot())
    const events = restored.finishDiceTurn()
    expect(events).toContainEqual({ type: 'bust', player: 'Alice' })
    expect(events).toContainEqual({ type: 'downgrade', player: 'Alice', from: 1000, to: 500 })
    expect(restored.players[0].score).toBe(500)
    expect(restored.currentPlayerIndex).toBe(1)
    restored.undoLastEvent()
    expect(restored.players[0].score).toBe(1000)
    expect(restored.players[0].failedTurnsInRow).toBe(2)
    expect(restored.diceTurn.phase).toBe('bust')
  })

  it('réutilise les collisions et la victoire exacte, sans nouvelle règle de score', () => {
    const game = makeGame([[5, 5, 5, 2, 3]])
    game.players[1].validateTurn(500)
    game.rollDice()
    expect(game.finishDiceTurn()).toContainEqual({
      type: 'downgrade',
      player: 'Bob',
      from: 500,
      to: 0,
    })
    expect(game.players[1].score).toBe(0)
    const winning = makeGame([[1, 2, 2, 3, 6]])
    winning.players[0].validateTurn(9900)
    winning.rollDice()
    winning.finishDiceTurn()
    expect(winning.winner).toBe(winning.players[0])
    expect(winning.players[0].score).toBe(10000)
    expect(() => winning.rollDice()).toThrow(/already over/)
    expect(() => winning.setDiceMode('physical')).toThrow(/already over/)
  })

  it('impose un lancer après reprise, puis le seuil et les centaines, même avant ouverture', () => {
    const game = makeGame([[2, 2, 2, 3, 6], [1, 2], [1], [1, 2, 2, 3, 6]])
    game.players[0].validateTurn(500)
    expect(() => game.rollDice({ takeOver: true })).toThrow(/Aucune reprise/)
    game.rollDice()
    game.finishDiceTurn()
    expect(() => game.finishDiceTurn()).toThrow(/Lancez/)
    expect(game.players[1].hasOpened).toBe(false)
    game.rollDice({ takeOver: true })
    expect(game.diceTurn.total).toBe(300)
    expect(() => game.finishDiceTurn()).toThrow(/encore 200/)
    expect(() => game.rollDice({ takeOver: true })).toThrow(/Aucune reprise/)
    game.rollDice()
    expect(game.diceTurn.total).toBe(400)
    expect(() => game.finishDiceTurn()).toThrow(/encore 100/)
    game.rollDice()
    game.finishDiceTurn()
    expect(game.players[1].score).toBe(500)
    expect(game.players[1].hasOpened).toBe(true)
    const restored = Game.fromSnapshot(game.getSnapshot())
    expect(restored.diceCarry).toEqual(game.diceCarry)
    restored.rng = () => (1 - 0.5) / 6
    restored.rollDice({ takeOver: true })
    expect(restored.diceTurn.total).toBe(2500)
    expect(restored.diceTurn.inheritedRolls).toHaveLength(4)
    expect(Game.fromSnapshot(restored.getSnapshot()).diceTurn).toEqual(restored.diceTurn)
  })

  it('ne permet pas d’arrêter à 550 sur reprise, ni de conserver la reprise en changeant de mode', () => {
    const game = makeGame([
      [5, 5, 5, 2, 3],
      [5, 2],
    ])
    game.rollDice()
    game.finishDiceTurn()
    const offered = game.getSnapshot()
    game.rollDice({ takeOver: true })
    expect(game.diceTurn.total).toBe(550)
    expect(() => game.finishDiceTurn()).toThrow(/multiple/)
    const physical = Game.fromSnapshot(offered)
    physical.setDiceMode('physical')
    expect(physical.diceCarry).toBeNull()
    physical.setDiceMode('virtual')
    expect(() => physical.rollDice({ takeOver: true })).toThrow(/Aucune reprise/)
  })

  it.each([
    [[4, 5, 4, 5, 5], 500],
    [[3, 3, 3, 1, 5], 450],
  ])('refuse tout nouveau tirage au dépassement %j, sans bloquer sa confirmation', (faces, total) => {
    const game = makeGame([faces])
    game.players[0].validateTurn(9700)
    game.rollDice()
    const before = game.getSnapshot()
    expect(game.diceTurn.total).toBe(total)
    expect(() => game.rollDice()).toThrow(/cible est dépassée/)
    expect(game.getSnapshot()).toEqual(before)
    expect(game.players[0].failedTurnsInRow).toBe(0)
    const restored = Game.fromSnapshot(before)
    expect(() => restored.rollDice()).toThrow(/cible est dépassée/)
    expect(restored.finishDiceTurn()).toEqual([{ type: 'bust', player: 'Alice' }])
    expect(restored.players[0].failedTurnsInRow).toBe(1)
    expect(restored.players[0].score).toBe(9700)
    expect(restored.currentPlayerIndex).toBe(1)
    expect(restored.diceCarry).toBeNull()
    expect(restored.undoLastEvent().diceTurn).toEqual(before.diceTurn)
  })

  it('sauve le montant validé de la reprise et continue à lire les anciennes offres en tableaux', () => {
    const game = makeGame([[5, 5, 5, 2, 3]])
    game.rollDice()
    game.finishDiceTurn()
    const saved = game.getSnapshot()
    expect(saved.diceCarry).toMatchObject({ total: 500, diceCount: 5, rolls: [[5, 5, 5, 2, 3]] })
    saved.diceCarry.total = 1000
    const restored = Game.fromSnapshot(JSON.parse(JSON.stringify(saved)))
    saved.diceCarry.total = 9000
    expect(restored.diceCarry.total).toBe(1000)
    restored.rng = () => (1 - 0.5) / 6
    restored.rollDice({ takeOver: true })
    expect(restored.diceTurn.total).toBe(1200)
    expect(Game.fromSnapshot(restored.getSnapshot()).diceTurn.total).toBe(1200)
    const legacy = game.getSnapshot()
    legacy.diceCarry = legacy.diceCarry.rolls
    const old = Game.fromSnapshot(legacy)
    old.rng = () => (1 - 0.5) / 6
    old.rollDice({ takeOver: true })
    expect(old.diceTurn.total).toBe(700)
  })

  it('adapte une reprise6 à la capacité5 du nouveau joueur et lance obligatoirement', () => {
    const game = makeGame([[1, 2, 2, 3, 6]])
    game.diceCarry = { rolls: [[1, 2, 3, 4, 5, 6]], total: 1600, diceCount: 6 }
    game.rollDice({ takeOver: true })
    expect(game.diceTurn.diceCount).toBe(5)
    expect(game.diceTurn.rolls).toEqual([[1, 2, 2, 3, 6]])
    expect(game.diceTurn.total).toBe(1700)
    expect(game.diceTurn.inheritedTotal).toBe(1600)
  })

  it.each([
    'cent-mille',
    'dix-mille-bonus',
  ])('ouvre %s avec le choix Aimant réel et un événement', (mode) => {
    const game = new Game(['Alice', 'Bob'], { mode, rng: () => 0 })
    game.setDiceMode('virtual')
    game.players[0].hand = ['aimant']
    game.playCard('aimant', { face: 1 })
    game.activeTableEvent = { id: 'tour-eclair', remainingTurns: 2 }
    game.rollDice()
    expect(game.diceTurn.total).toBe(4000)
    expect(game.activeTurnModifiers.aimantFace).toBe(1)
    expect(Game.fromSnapshot(game.getSnapshot()).diceTurn).toEqual(game.diceTurn)
  })
})
