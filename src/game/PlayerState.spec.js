import { describe, expect, it } from 'vitest'
import { PlayerState } from './PlayerState.js'

describe('PlayerState', () => {
  it('updates score and opens player after a validated turn', () => {
    const player = new PlayerState('Alice')

    player.validateTurn(600)

    expect(player.score).toBe(600)
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
})
