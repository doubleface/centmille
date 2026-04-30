import { describe, expect, it } from 'vitest'
import { GameState } from './GameState.js'

describe('GameState', () => {
  it('rejects invalid constructor inputs', () => {
    expect(() => new GameState(['Alice'])).toThrow('GameState requires at least 2 players')
    expect(() => new GameState(['Alice', ''])).toThrow('Player names must be non-empty strings')
    expect(() => new GameState(['Alice', 'Bob'], { diceCount: 0 })).toThrow(
      'diceCount must be a positive integer'
    )
  })

  it('starts with first player and no steal option', () => {
    const game = new GameState(['Alice', 'Bob'])

    expect(game.getCurrentPlayer().name).toBe('Alice')
    expect(game.getTurnStartState()).toEqual({
      canSteal: false,
      carriedScore: 0,
      diceToRoll: 5,
    })
  })

  it('scores a roll through DiceScorer from GameState', () => {
    const game = new GameState(['Alice', 'Bob'])

    const result = game.scoreRoll([1, 5, 2, 2, 3])

    expect(result.score).toBe(150)
    expect(result.scoringDiceCount).toBe(2)
  })

  it('rejects invalid dice roll input', () => {
    const game = new GameState(['Alice', 'Bob'])

    expect(() => game.scoreRoll([0, 7])).toThrow(
      'Dice roll must contain between 1 and 5 integers in range 1-6'
    )
  })

  it('plays a full turn with keep, reroll, then stop', () => {
    const game = new GameState(['Alice', 'Bob'])

    game.startTurn()
    const firstRoll = game.playRoll([1, 2, 3, 4, 6], [1])
    expect(firstRoll.turnScore).toBe(100)
    expect(firstRoll.diceToRoll).toBe(4)

    const secondRoll = game.playRoll([5, 2, 3, 4], [5])
    expect(secondRoll.turnScore).toBe(150)
    expect(secondRoll.diceToRoll).toBe(3)

    expect(() => game.stopTurn()).toThrow('Cannot stop on a non-multiple of 100')
  })

  it('fails a turn on bust during active play', () => {
    const game = new GameState(['Alice', 'Bob'])

    game.startTurn()
    const result = game.playRoll([2, 3, 4, 6, 2], [2])

    expect(result.type).toBe('failure')
    expect(game.getCurrentPlayer().name).toBe('Bob')
  })

  it('returns active turn snapshot after start', () => {
    const game = new GameState(['Alice', 'Bob'])

    game.startTurn()

    expect(game.getActiveTurn()).toEqual({
      turnScore: 0,
      diceToRoll: 5,
      canSteal: false,
    })
  })

  it('returns null when no active turn exists', () => {
    const game = new GameState(['Alice', 'Bob'])

    expect(game.getActiveTurn()).toBe(null)
  })

  it('rejects starting a turn when one is already active', () => {
    const game = new GameState(['Alice', 'Bob'])

    game.startTurn()

    expect(() => game.startTurn()).toThrow('A turn is already active')
  })

  it('rejects playing a roll when no active turn exists', () => {
    const game = new GameState(['Alice', 'Bob'])

    expect(() => game.playRoll([1, 2, 3, 4, 6], [1])).toThrow(
      'No active turn. Call startTurn first'
    )
  })

  it('rejects invalid kept dice during roll', () => {
    const game = new GameState(['Alice', 'Bob'])

    game.startTurn()
    expect(() => game.playRoll([1, 2, 3, 4], [1])).toThrow('Expected 5 dice in this roll')

    expect(() => game.playRoll([1, 2, 3, 4, 6], [])).toThrow('You must keep at least one scoring die')

    expect(() => game.playRoll([1, 2, 3, 4, 6], [1, 1])).toThrow(
      'Kept dice must be a subset of rolled dice'
    )

    expect(() => game.playRoll([1, 2, 3, 4, 6], [2])).toThrow('All kept dice must score')
  })

  it('rejects stopping turn when no active turn exists', () => {
    const game = new GameState(['Alice', 'Bob'])

    expect(() => game.stopTurn()).toThrow('No active turn. Call startTurn first')
  })

  it('rejects incoherent stopping parameters', () => {
    const game = new GameState(['Alice', 'Bob'])

    expect(() => game.endTurnByStopping(0, 2)).toThrow('turnScore must be a positive integer')
    expect(() => game.endTurnByStopping(200, 6)).toThrow(
      'diceRemaining must be an integer between 0 and 5'
    )
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
    expect(result.reason).toBe('overshoot')
    expect(alice.score).toBe(9900)
    expect(alice.failedTurnsInRow).toBe(1)
  })

  it('drops to previous checkpoint after 3 overshoots', () => {
    const game = new GameState(['Alice', 'Bob'])
    const alice = game.getCurrentPlayer()
    alice.hasOpened = true
    alice.previousCheckpointScore = 1200
    alice.score = 1500

    game.endTurnByStopping(9000, 1)
    game.currentPlayerIndex = 0
    game.endTurnByStopping(9000, 1)
    game.currentPlayerIndex = 0
    const thirdResult = game.endTurnByStopping(9000, 1)

    expect(thirdResult.type).toBe('failure')
    expect(thirdResult.reason).toBe('overshoot')
    expect(thirdResult.checkpointDrop).toBe(true)
    expect(alice.score).toBe(1200)
    expect(alice.failedTurnsInRow).toBe(0)
  })

  it('exposes steal state for next player after validated stop', () => {
    const game = new GameState(['Alice', 'Bob'])

    game.startTurn()
    game.playRoll([5, 5, 5, 2, 2], [5, 5, 5])
    game.stopTurn()

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

  it('applies chained collision drops across multiple players', () => {
    const game = new GameState(['Alice', 'Bob', 'Charlie'])

    const alice = game.players[0]
    const bob = game.players[1]
    const charlie = game.players[2]

    alice.hasOpened = true
    bob.hasOpened = true
    charlie.hasOpened = true

    alice.score = 900
    alice.previousCheckpointScore = 500

    bob.score = 1200
    bob.previousCheckpointScore = 700

    charlie.score = 700
    charlie.previousCheckpointScore = 300

    const result = game.endTurnByStopping(300, 1)

    expect(result.type).toBe('validated')
    expect(alice.score).toBe(1200)
    expect(bob.score).toBe(700)
    expect(charlie.score).toBe(300)
  })

  it('starts next turn with carried score and remaining dice after a stop', () => {
    const game = new GameState(['Alice', 'Bob'])

    game.startTurn()
    game.playRoll([5, 5, 5, 2, 2], [5, 5, 5])
    game.stopTurn()

    const nextTurn = game.startTurn()

    expect(game.getCurrentPlayer().name).toBe('Bob')
    expect(nextTurn.canSteal).toBe(true)
    expect(nextTurn.turnScore).toBe(500)
    expect(nextTurn.diceToRoll).toBe(2)
  })

  it('starts next turn with full dice after a hot dice stop', () => {
    const game = new GameState(['Alice', 'Bob'])

    game.endTurnByStopping(500, 0)

    const nextTurn = game.startTurn()

    expect(game.getCurrentPlayer().name).toBe('Bob')
    expect(nextTurn.canSteal).toBe(true)
    expect(nextTurn.turnScore).toBe(500)
    expect(nextTurn.diceToRoll).toBe(5)
  })

  it('returns a serializable snapshot of game state', () => {
    const game = new GameState(['Alice', 'Bob'])

    game.startTurn()
    game.playRoll([5, 5, 5, 2, 2], [5, 5, 5])

    const snapshot = game.getSnapshot()

    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot)
    expect(snapshot.players[0].name).toBe('Alice')
    expect(snapshot.activeTurn?.turnScore).toBe(500)
  })

  it('restores game state from a snapshot', () => {
    const game = new GameState(['Alice', 'Bob'])
    game.endTurnByStopping(500, 2)

    const snapshot = game.getSnapshot()
    const restoredGame = GameState.fromSnapshot(snapshot)

    expect(restoredGame.getSnapshot()).toEqual(snapshot)
    expect(restoredGame.getCurrentPlayer().name).toBe('Bob')
  })

  it('rejects invalid snapshot input', () => {
    expect(() => GameState.fromSnapshot(null)).toThrow('Snapshot must be an object')
    expect(() => GameState.fromSnapshot({ players: [] })).toThrow(
      'Snapshot must contain at least 2 players'
    )
  })
})
