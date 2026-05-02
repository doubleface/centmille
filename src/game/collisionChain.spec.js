import { describe, expect, it } from 'vitest'
import { PlayerState } from './PlayerState.js'
import { applyCollisionChain } from './collisionChain.js'

describe('applyCollisionChain', () => {
  it('applies chained checkpoint drops', () => {
    const alice = new PlayerState('Alice')
    const bob = new PlayerState('Bob')
    const charlie = new PlayerState('Charlie')

    alice.score = 1200
    alice.previousCheckpointScore = 500
    alice.checkpointHistory = [0, 500, 1200]

    bob.score = 700
    bob.previousCheckpointScore = 500
    bob.checkpointHistory = [0, 500, 700]

    charlie.score = 1200
    charlie.previousCheckpointScore = 700
    charlie.checkpointHistory = [0, 700, 1200]

    applyCollisionChain([alice, bob, charlie], 0)

    expect(charlie.score).toBe(700)
    expect(bob.score).toBe(500)
  })

  it('ignores invalid input', () => {
    expect(() => applyCollisionChain(null, 0)).not.toThrow()
    expect(() => applyCollisionChain([], 0)).not.toThrow()
  })
})
