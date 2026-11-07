import { describe, expect, it } from 'vitest'
import { Game } from './Game.js'

describe('Game', () => {
  it('rejects invalid constructor and options', () => {
    expect(() => new Game(['Alice'])).toThrow('Game requires at least 2 players')
    expect(() => new Game(['Alice', ''])).toThrow('Player names must be non-empty strings')
    expect(() => new Game(['Alice', 'Bob'], { targetScore: 0 })).toThrow(
      'targetScore must be a positive integer'
    )
    expect(() => new Game(['Alice', 'Bob'], { openingScore: -1 })).toThrow(
      'openingScore must be a non-negative integer'
    )
  })

  it('forbids opening below openingScore', () => {
    const game = new Game(['Alice', 'Bob'])

    expect(() => game.recordTurn(400)).toThrow('Cannot open below 500 points')
  })

  it('marks winner on exact target score', () => {
    const game = new Game(['Alice', 'Bob'])
    const alice = game.players[0]

    alice.hasOpened = true
    alice.score = 9800
    alice.checkpointHistory = [0, 9800]
    alice.previousCheckpointScore = 0

    const events = game.recordTurn(200)

    expect(events[0]).toEqual({
      type: 'score',
      player: 'Alice',
      turnScore: 200,
      cumulative: 10000,
    })
    expect(game.winner?.name).toBe('Alice')
  })

  it('rejects overshoot', () => {
    const game = new Game(['Alice', 'Bob'])
    const alice = game.players[0]

    alice.hasOpened = true
    alice.score = 9900
    alice.checkpointHistory = [0, 9900]

    expect(() => game.recordTurn(200)).toThrow('Cannot overshoot 10000 points')
  })

  it('applies simple collision downgrade', () => {
    const game = new Game(['Alice', 'Bob'])

    game.recordTurn(500)
    game.recordTurn(500)
    const events = game.recordTurn(500)

    expect(events).toContainEqual({
      type: 'downgrade',
      player: 'Bob',
      from: 500,
      to: 0,
    })
    expect(game.players[1].score).toBe(0)
  })

  it('applies chained collisions', () => {
    const game = new Game(['Alice', 'Bob', 'Charlie'])
    const [alice, bob, charlie] = game.players

    alice.hasOpened = true
    bob.hasOpened = true
    charlie.hasOpened = true

    alice.checkpointHistory = [0, 500, 900]
    alice.score = 900
    alice.previousCheckpointScore = 500

    bob.checkpointHistory = [0, 700, 1200]
    bob.score = 1200
    bob.previousCheckpointScore = 700

    charlie.checkpointHistory = [0, 500, 700]
    charlie.score = 700
    charlie.previousCheckpointScore = 500

    const events = game.recordTurn(300)

    expect(events).toContainEqual({
      type: 'downgrade',
      player: 'Bob',
      from: 1200,
      to: 700,
    })
    expect(events).toContainEqual({
      type: 'downgrade',
      player: 'Charlie',
      from: 700,
      to: 500,
    })
  })

  it('drops to checkpoint after 3 busts', () => {
    const game = new Game(['Alice', 'Bob'])
    const alice = game.players[0]

    alice.hasOpened = true
    alice.checkpointHistory = [0, 500, 1200]
    alice.score = 1200
    alice.previousCheckpointScore = 500

    game.recordBust()
    game.currentPlayerIndex = 0
    game.recordBust()
    game.currentPlayerIndex = 0
    const events = game.recordBust()

    expect(events).toContainEqual({
      type: 'downgrade',
      player: 'Alice',
      from: 1200,
      to: 500,
    })
    expect(alice.score).toBe(500)
    expect(alice.failedTurnsInRow).toBe(0)
  })

  it('undoes last action from snapshot', () => {
    const game = new Game(['Alice', 'Bob'])

    game.recordTurn(500)
    const beforeBust = game.getSnapshot()
    game.recordBust()

    const restored = game.undoLastEvent()

    expect(restored).toEqual(beforeBust)
    expect(game.getSnapshot()).toEqual(beforeBust)
  })

  it('returns null when undo stack is empty', () => {
    const game = new Game(['Alice', 'Bob'])

    expect(game.undoLastEvent()).toBeNull()
  })

  it('rejects invalid turn score values', () => {
    const game = new Game(['Alice', 'Bob'])

    expect(() => game.recordTurn(0)).toThrow('turnScore must be a positive integer')
    expect(() => game.recordTurn(150)).toThrow('Cannot stop on a non-multiple of 100')
  })

  it('rejects actions once a winner exists', () => {
    const game = new Game(['Alice', 'Bob'])
    game.players[0].hasOpened = true
    game.players[0].score = 9900
    game.players[0].checkpointHistory = [0, 9900]

    game.recordTurn(100)

    expect(() => game.recordTurn(100)).toThrow('Game is already over')
    expect(() => game.recordBust()).toThrow('Game is already over')
  })

  it('serializes and restores state from snapshot', () => {
    const game = new Game(['Alice', 'Bob'])
    game.recordTurn(500)

    const snapshot = game.getSnapshot()
    const restored = Game.fromSnapshot(snapshot)

    expect(restored.getSnapshot()).toEqual(snapshot)
  })

  it('rejects invalid snapshot input', () => {
    expect(() => Game.fromSnapshot(null)).toThrow('Snapshot must be an object')
    expect(() => Game.fromSnapshot({ players: [] })).toThrow(
      'Snapshot must contain at least 2 players'
    )
  })

  it('supports snapshot fallback fields', () => {
    const snapshot = {
      targetScore: 10000,
      openingScore: 500,
      currentPlayerIndex: 0,
      players: [
        {
          name: 'Alice',
          score: 500,
          previousCheckpointScore: 0,
          hasOpened: true,
          failedTurnsInRow: 0,
        },
        {
          name: 'Bob',
          score: 0,
          previousCheckpointScore: 0,
          checkpointHistory: [0],
          hasOpened: false,
          failedTurnsInRow: 0,
        },
      ],
      winnerIndex: null,
    }

    const restored = Game.fromSnapshot(snapshot)
    expect(restored.players[0].checkpointHistory).toEqual([0, 500])
    expect(restored.events).toEqual([])
  })
})
