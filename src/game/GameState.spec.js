import { describe, expect, it } from 'vitest'
import { GameState } from './GameState.js'

describe('GameState', () => {
  it('starts with first player and no steal option', () => {
    const game = new GameState(['Alice', 'Bob'])

    expect(game.getCurrentPlayer().name).toBe('Alice')
    expect(game.getTurnStartState()).toEqual({
      canSteal: false,
      carriedScore: 0,
      diceToRoll: 5,
    })
  })

  it('forbids stopping on a non-multiple of 100', () => {
    const game = new GameState(['Alice', 'Bob'])

    expect(() => game.endTurnByStopping(250, 2)).toThrow('Cannot stop on a non-multiple of 100')
  })

  it('forbids opening below 500 points', () => {
    const game = new GameState(['Alice', 'Bob'])

    expect(() => game.endTurnByStopping(400, 2)).toThrow('Cannot open below 500 points')
  })

  it('counts overshoot as a failed turn', () => {
    const game = new GameState(['Alice', 'Bob'])

    const alice = game.getCurrentPlayer()
    alice.hasOpened = true
    alice.score = 9900

    const result = game.endTurnByStopping(200, 1)

    expect(result.type).toBe('failure')
    expect(alice.score).toBe(9900)
    expect(alice.failedTurnsInRow).toBe(1)
  })

  it('exposes steal state for next player after validated stop', () => {
    const game = new GameState(['Alice', 'Bob'])

    game.endTurnByStopping(500, 2)

    expect(game.getCurrentPlayer().name).toBe('Bob')
    expect(game.getTurnStartState()).toEqual({
      canSteal: true,
      carriedScore: 500,
      diceToRoll: 2,
    })
  })

  it('resets to full dice for steal after hot dice stop', () => {
    const game = new GameState(['Alice', 'Bob'])

    game.endTurnByStopping(500, 0)

    expect(game.getTurnStartState()).toEqual({
      canSteal: true,
      carriedScore: 500,
      diceToRoll: 5,
    })
  })

  it('drops collided player to previous checkpoint', () => {
    const game = new GameState(['Alice', 'Bob'])

    game.endTurnByStopping(500, 2)
    game.endTurnByStopping(500, 1)
    game.endTurnByStopping(500, 1)

    const alice = game.players[0]
    const bob = game.players[1]

    expect(alice.score).toBe(500)
    expect(bob.score).toBe(0)
  })

  it('marks winner on exact target score', () => {
    const game = new GameState(['Alice', 'Bob'])
    const alice = game.getCurrentPlayer()
    alice.hasOpened = true
    alice.score = 9800

    const result = game.endTurnByStopping(200, 1)

    expect(result.type).toBe('validated')
    expect(result.winner?.name).toBe('Alice')
    expect(alice.score).toBe(10000)
  })
})
