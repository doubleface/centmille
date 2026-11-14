import { describe, expect, it } from 'vitest'
import { diceStopReason, diceTurnScore, newDiceTurn, rollDiceTurn } from './DiceTurn.js'
import { Game } from './Game.js'

describe('même score après cartes sur le vrai moteur et le plateau', () => {
  it.each([
    'cent-mille',
    'dix-mille-bonus',
  ])('%s : Alice valide1000 et Bob remultiplie reprise1000 + gain100 en2200', (mode) => {
    const game = new Game(['Alice', 'Bob'], { mode, rng: () => 0 })
    game.players[0].hand = ['doubleur']
    game.players[1].hand = ['doubleur']
    game.playCard('doubleur')
    const alice = rollDiceTurn(newDiceTurn(), [5, 5, 5, 2, 3])
    const events = game.recordTurn(alice.total)
    const validated = events.find((event) => event.type === 'score').turnScore
    expect(validated).toBe(1000)
    expect(game.players[0].score).toBe(1000)
    // Frontière physique existante et scoreur pur ; les parcours virtuels complets sont testés séparément.
    const carry = JSON.parse(JSON.stringify({ rolls: alice.rolls, total: validated, diceCount: 5 }))
    const inherited = newDiceTurn(carry)
    expect(diceStopReason(inherited, game.getCurrentPlayer())).toContain('Lancez')
    const bob = rollDiceTurn(inherited, [1, 2])
    game.playCard('doubleur')
    expect(bob.total).toBe(1100)
    expect(diceTurnScore(bob, game.activeTurnModifiers)).toBe(2200)
    const before = game.getSnapshot()
    const bobEvents = game.recordTurn(bob.total)
    expect(game.players[1].score).toBe(2200)
    expect(bobEvents).toContainEqual({
      type: 'score',
      player: 'Bob',
      turnScore: 2200,
      cumulative: 2200,
    })
    expect(game.players[0].score).toBe(1000)
    expect(game.undoLastEvent()).toEqual(before)
    const restored = Game.fromSnapshot(JSON.parse(JSON.stringify(game.getSnapshot())))
    restored.recordTurn(bob.total)
    expect(restored.players[1].score).toBe(2200)
  })

  it.each([
    ['dix-mille-bonus', [1, 1, 5, 2, 3], 250, ['arrondi', 'doubleur'], {}, 600],
    ['cent-mille', [5, 5, 5, 2, 3], 500, ['contrat', 'doubleur'], { targetScore: 500 }, 2000],
    ['cent-mille', [1, 1, 1, 2, 3], 1000, ['tout-ou-rien', 'doubleur'], {}, 6000],
  ])('%s : applique réellement %j/%i une seule fois, puis restaure le tour', (mode, faces, raw, cards, payload, expected) => {
    const game = new Game(['Alice', 'Bob'], { mode, rng: () => 0 })
    game.players[0].hand = [...cards]
    for (const card of cards) game.playCard(card, payload)
    const turn = rollDiceTurn(newDiceTurn(), faces)
    const before = game.getSnapshot()
    expect(diceTurnScore(turn, game.activeTurnModifiers)).toBe(expected)
    expect(diceStopReason(turn, game.players[0], 500, game.activeTurnModifiers)).toBe('')
    const events = game.recordTurn(turn.total)
    expect(game.players[0].score).toBe(expected)
    expect(events).toContainEqual({
      type: 'score',
      player: 'Alice',
      turnScore: expected,
      cumulative: expected,
    })
    expect(game.players[0].hasOpened).toBe(true)
    expect(game.currentPlayerIndex).toBe(1)
    expect(game.activeTurnModifiers.doubleur).toBe(false)
    const restored = Game.fromSnapshot(JSON.parse(JSON.stringify(game.undoLastEvent())))
    expect(restored.getSnapshot()).toEqual(before)
    restored.recordTurn(turn.total)
    expect(restored.players[0].score).toBe(expected)
    expect(restored.events.filter((event) => event.type === 'score')).toHaveLength(1)
    expect(turn.total).toBe(raw)
  })
})
