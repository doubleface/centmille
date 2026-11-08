import { describe, expect, it } from 'vitest'
import { PlayerState } from './PlayerState.js'

describe('PlayerState', () => {
  it('initializes with default values and Cent Mille properties', () => {
    const player = new PlayerState('Alice')

    expect(player.name).toBe('Alice')
    expect(player.score).toBe(0)
    expect(player.previousCheckpointScore).toBe(0)
    expect(player.checkpointHistory).toEqual([0])
    expect(player.hasOpened).toBe(false)
    expect(player.failedTurnsInRow).toBe(0)
    expect(player.hand).toEqual([])
    expect(player.achievements).toEqual([])
    expect(player.highestTierReached).toBe(0)
    expect(player.unrewardedDrops).toBe(0)
    expect(player.hasEnteredRedZoneBefore).toBe(false)
    expect(player.scoreBeforeLastDrop).toBeNull()
    expect(player.exactTiersClaimed).toEqual([])
    expect(player.status).toEqual({
      frozen: false,
      cursed: false,
      ghost: false,
      vampire: false,
      extraTurn: false,
    })
  })

  it('updates score and opens player after a validated turn', () => {
    const player = new PlayerState('Alice')

    player.validateTurn(600)

    expect(player.score).toBe(600)
    expect(player.previousCheckpointScore).toBe(0)
    expect(player.checkpointHistory).toEqual([0, 600])
    expect(player.hasOpened).toBe(true)
    expect(player.failedTurnsInRow).toBe(0)
  })

  it('handles validateTurn when checkpointHistory was empty', () => {
    const player = new PlayerState('Alice')
    player.checkpointHistory = []

    player.validateTurn(500)

    expect(player.score).toBe(500)
    expect(player.previousCheckpointScore).toBe(0)
    expect(player.checkpointHistory).toEqual([500])
  })

  it('drops to checkpoint after 3 failed turns', () => {
    const player = new PlayerState('Bob')
    player.validateTurn(1000)
    player.validateTurn(200)

    player.failTurn()
    player.failTurn()
    const result = player.failTurn()

    expect(result.checkpointDrop).toBe(true)
    expect(player.score).toBe(1000)
    expect(player.failedTurnsInRow).toBe(0)
    expect(player.scoreBeforeLastDrop).toBe(1200)
  })

  it('supports extraPenalty in failTurn for Tout ou Rien', () => {
    const player = new PlayerState('Bob')
    player.validateTurn(1000)

    const result1 = player.failTurn({ extraPenalty: 1 })
    expect(result1.checkpointDrop).toBe(false)
    expect(player.failedTurnsInRow).toBe(2)

    const result2 = player.failTurn({ extraPenalty: 1 })
    expect(result2.checkpointDrop).toBe(true)
    expect(player.failedTurnsInRow).toBe(0)
    expect(player.score).toBe(0)

    const result3 = player.failTurn(null)
    expect(result3.checkpointDrop).toBe(false)
    expect(player.failedTurnsInRow).toBe(1)
  })

  it('keeps full checkpoint history for successive drops and records scoreBeforeLastDrop', () => {
    const player = new PlayerState('Bob')
    player.validateTurn(500)
    player.validateTurn(500)
    player.validateTurn(500)

    player.dropToPreviousCheckpoint()
    expect(player.score).toBe(1000)
    expect(player.scoreBeforeLastDrop).toBe(1500)

    player.dropToPreviousCheckpoint()
    expect(player.score).toBe(500)
    expect(player.previousCheckpointScore).toBe(0)
    expect(player.checkpointHistory).toEqual([0, 500])
    expect(player.scoreBeforeLastDrop).toBe(1000)
  })

  it('keeps score at zero when dropping with base history only and leaves scoreBeforeLastDrop null', () => {
    const player = new PlayerState('Eve')

    player.dropToPreviousCheckpoint()

    expect(player.score).toBe(0)
    expect(player.previousCheckpointScore).toBe(0)
    expect(player.checkpointHistory).toEqual([0])
    expect(player.scoreBeforeLastDrop).toBeNull()
  })

  it('supports dropMultipleCheckpoints with custom count', () => {
    const player = new PlayerState('Dan')
    player.validateTurn(500)
    player.validateTurn(500)
    player.validateTurn(500)
    player.validateTurn(500)

    expect(player.score).toBe(2000)
    expect(player.checkpointHistory).toEqual([0, 500, 1000, 1500, 2000])

    player.dropMultipleCheckpoints(2)

    expect(player.score).toBe(1000)
    expect(player.previousCheckpointScore).toBe(500)
    expect(player.checkpointHistory).toEqual([0, 500, 1000])
    expect(player.scoreBeforeLastDrop).toBe(2000)
  })

  it('dropMultipleCheckpoints breaks safely when dropping beyond base history', () => {
    const player = new PlayerState('Dan')
    player.validateTurn(500)

    player.dropMultipleCheckpoints(5)

    expect(player.score).toBe(0)
    expect(player.previousCheckpointScore).toBe(0)
    expect(player.checkpointHistory).toEqual([0])
    expect(player.scoreBeforeLastDrop).toBe(500)
  })

  it('ignores dropMultipleCheckpoints when count <= 0', () => {
    const player = new PlayerState('Dan')
    player.validateTurn(500)

    player.dropMultipleCheckpoints(0)
    player.dropMultipleCheckpoints(-2)

    expect(player.score).toBe(500)
    expect(player.checkpointHistory).toEqual([0, 500])
  })

  it('supports dropHalfGap for Parachute mechanics', () => {
    const player = new PlayerState('Charlie')
    player.validateTurn(1000)
    player.validateTurn(1500)

    expect(player.score).toBe(2500)
    expect(player.previousCheckpointScore).toBe(1000)

    player.dropHalfGap()

    expect(player.scoreBeforeLastDrop).toBe(2500)
    expect(player.score).toBe(1800)
    expect(player.previousCheckpointScore).toBe(1000)
    expect(player.checkpointHistory).toEqual([0, 1000, 1800])
  })

  it('handles dropHalfGap when newScore equals target checkpoint', () => {
    const player = new PlayerState('Charlie')
    player.checkpointHistory = [0, 1000, 1000]
    player.score = 1000
    player.previousCheckpointScore = 1000

    player.dropHalfGap()

    expect(player.score).toBe(1000)
    expect(player.previousCheckpointScore).toBe(0)
    expect(player.checkpointHistory).toEqual([0, 1000])
  })

  it('handles dropHalfGap on initial base history at score zero', () => {
    const player = new PlayerState('Charlie')

    player.dropHalfGap()

    expect(player.score).toBe(0)
    expect(player.previousCheckpointScore).toBe(0)
    expect(player.checkpointHistory).toEqual([0])
    expect(player.scoreBeforeLastDrop).toBeNull()
  })

  it('handles dropMultipleCheckpoints and dropHalfGap when checkpointHistory is empty', () => {
    const player1 = new PlayerState('Empty1')
    player1.checkpointHistory = []
    player1.dropMultipleCheckpoints(1)
    expect(player1.score).toBe(0)
    expect(player1.previousCheckpointScore).toBe(0)

    const player2 = new PlayerState('Empty2')
    player2.checkpointHistory = []
    player2.dropHalfGap()
    expect(player2.score).toBe(0)
    expect(player2.previousCheckpointScore).toBe(0)
  })

  it('adjustScore updates score and current checkpoint in place', () => {
    const player = new PlayerState('Eve')
    player.validateTurn(2000)

    player.adjustScore(1000)
    expect(player.score).toBe(3000)
    expect(player.checkpointHistory).toEqual([0, 3000])
    expect(player.previousCheckpointScore).toBe(0)

    player.adjustScore(-500)
    expect(player.score).toBe(2500)
    expect(player.checkpointHistory).toEqual([0, 2500])
    expect(player.previousCheckpointScore).toBe(0)

    player.adjustScore(-3000)
    expect(player.score).toBe(0)
    expect(player.checkpointHistory).toEqual([0])
  })

  it('adjustScore purges intermediate checkpoints that exceed the new score', () => {
    const player = new PlayerState('Bob')
    player.score = 20200
    player.checkpointHistory = [0, 1000, 19500, 20200]
    player.previousCheckpointScore = 19500

    player.adjustScore(-4000)

    expect(player.score).toBe(16200)
    expect(player.checkpointHistory).toEqual([0, 1000, 16200])
    expect(player.previousCheckpointScore).toBe(1000)

    player.dropToPreviousCheckpoint()
    expect(player.score).toBe(1000)
    expect(player.checkpointHistory).toEqual([0, 1000])
    expect(player.previousCheckpointScore).toBe(0)
  })

  it('adjustScore handles player at zero before opening', () => {
    const player = new PlayerState('Eve')

    player.adjustScore(-500)
    expect(player.score).toBe(0)
    expect(player.checkpointHistory).toEqual([0])

    player.adjustScore(1000)
    expect(player.score).toBe(1000)
    expect(player.checkpointHistory).toEqual([0, 1000])
    expect(player.previousCheckpointScore).toBe(0)
  })

  it('serializes to snapshot and deserializes back faithfully', () => {
    const player = new PlayerState('Alice')
    player.validateTurn(1000)
    player.hand = ['bouclier', 'arrondi']
    player.achievements = ['coup-declat']
    player.highestTierReached = 20000
    player.unrewardedDrops = 1
    player.hasEnteredRedZoneBefore = true
    player.scoreBeforeLastDrop = 1500
    player.exactTiersClaimed = [20000]
    player.status.frozen = true
    player.status.cursed = true

    const snapshot = player.toSnapshot()

    expect(snapshot).toEqual({
      name: 'Alice',
      score: 1000,
      previousCheckpointScore: 0,
      checkpointHistory: [0, 1000],
      hasOpened: true,
      failedTurnsInRow: 0,
      hand: ['bouclier', 'arrondi'],
      achievements: ['coup-declat'],
      highestTierReached: 20000,
      unrewardedDrops: 1,
      hasEnteredRedZoneBefore: true,
      scoreBeforeLastDrop: 1500,
      exactTiersClaimed: [20000],
      status: {
        frozen: true,
        cursed: true,
        ghost: false,
        vampire: false,
        extraTurn: false,
      },
    })

    const restored = PlayerState.fromSnapshot(snapshot)

    expect(restored).toBeInstanceOf(PlayerState)
    expect(restored.name).toBe('Alice')
    expect(restored.score).toBe(1000)
    expect(restored.hand).toEqual(['bouclier', 'arrondi'])
    expect(restored.exactTiersClaimed).toEqual([20000])
    expect(restored.status.frozen).toBe(true)
    expect(restored.status.cursed).toBe(true)

    snapshot.hand.push('duel')
    snapshot.exactTiersClaimed.push(40000)
    snapshot.status.ghost = true
    expect(restored.hand).toEqual(['bouclier', 'arrondi'])
    expect(restored.exactTiersClaimed).toEqual([20000])
    expect(restored.status.ghost).toBe(false)
  })

  it('deserializes legacy snapshots without new Cent Mille fields', () => {
    const legacySnapshot = {
      name: 'LegacyPlayer',
      score: 1500,
      previousCheckpointScore: 500,
      checkpointHistory: [0, 500, 1500],
      hasOpened: true,
      failedTurnsInRow: 1,
    }

    const restored = PlayerState.fromSnapshot(legacySnapshot)

    expect(restored.name).toBe('LegacyPlayer')
    expect(restored.score).toBe(1500)
    expect(restored.previousCheckpointScore).toBe(500)
    expect(restored.checkpointHistory).toEqual([0, 500, 1500])
    expect(restored.hasOpened).toBe(true)
    expect(restored.failedTurnsInRow).toBe(1)
    expect(restored.hand).toEqual([])
    expect(restored.achievements).toEqual([])
    expect(restored.highestTierReached).toBe(0)
    expect(restored.unrewardedDrops).toBe(0)
    expect(restored.hasEnteredRedZoneBefore).toBe(false)
    expect(restored.scoreBeforeLastDrop).toBeNull()
    expect(restored.exactTiersClaimed).toEqual([])
    expect(restored.status).toEqual({
      frozen: false,
      cursed: false,
      ghost: false,
      vampire: false,
      extraTurn: false,
    })
  })

  it('deserializes snapshots with missing checkpointHistory safely', () => {
    const restored = PlayerState.fromSnapshot({
      name: 'NoHistory',
      score: 800,
    })

    expect(restored.checkpointHistory).toEqual([0, 800])
    expect(restored.name).toBe('NoHistory')
    expect(restored.score).toBe(800)
  })

  it('deserializes completely empty snapshot object using defaults', () => {
    const restored = PlayerState.fromSnapshot({})
    expect(restored.name).toBe('')
    expect(restored.score).toBe(0)
    expect(restored.previousCheckpointScore).toBe(0)
    expect(restored.checkpointHistory).toEqual([0, 0])
    expect(restored.hasOpened).toBe(false)
    expect(restored.failedTurnsInRow).toBe(0)
    expect(restored.highestTierReached).toBe(0)
    expect(restored.unrewardedDrops).toBe(0)
    expect(restored.scoreBeforeLastDrop).toBeNull()
  })

  it('throws an error when fromSnapshot receives invalid input', () => {
    expect(() => PlayerState.fromSnapshot(null)).toThrow('Snapshot must be an object')
    expect(() => PlayerState.fromSnapshot('invalid')).toThrow('Snapshot must be an object')
    expect(() => PlayerState.fromSnapshot(123)).toThrow('Snapshot must be an object')
  })
})
