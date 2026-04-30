import { describe, expect, it } from 'vitest'
import { PlayerState } from './PlayerState.js'

describe('PlayerState', () => {
  it('updates score and opens player after a validated turn', () => {
    const player = new PlayerState('Alice')

    player.validateTurn(600)

    expect(player.score).toBe(600)
    expect(player.previousCheckpointScore).toBe(0)
    expect(player.checkpointHistory).toEqual([0, 600])
    expect(player.hasOpened).toBe(true)
    expect(player.failedTurnsInRow).toBe(0)
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
  })

  it('keeps full checkpoint history for successive drops', () => {
    const player = new PlayerState('Bob')
    player.validateTurn(500)
    player.validateTurn(500)
    player.validateTurn(500)

    player.dropToPreviousCheckpoint()
    expect(player.score).toBe(1000)

    player.dropToPreviousCheckpoint()
    expect(player.score).toBe(500)
    expect(player.previousCheckpointScore).toBe(0)
    expect(player.checkpointHistory).toEqual([0, 500])
  })

  it('keeps score at zero when dropping with base history only', () => {
    const player = new PlayerState('Eve')

    player.dropToPreviousCheckpoint()

    expect(player.score).toBe(0)
    expect(player.previousCheckpointScore).toBe(0)
    expect(player.checkpointHistory).toEqual([0])
  })
})
