import { describe, expect, it } from 'vitest'
import { applyCollisionChain } from './collisionChain.js'
import { PlayerState } from './PlayerState.js'

describe('applyCollisionChain', () => {
  it('applies chained checkpoint drops and returns collision details', () => {
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

    const collisions = applyCollisionChain([alice, bob, charlie], 0)

    expect(charlie.score).toBe(700)
    expect(bob.score).toBe(500)
    expect(collisions).toEqual([
      {
        victimIndex: 2,
        attackerIndex: 0,
        player: 'Charlie',
        attacker: 'Alice',
        from: 1200,
        to: 700,
        isDirect: true,
      },
      {
        victimIndex: 1,
        attackerIndex: 2,
        player: 'Bob',
        attacker: 'Charlie',
        from: 700,
        to: 500,
        isDirect: false,
      },
    ])
  })

  it('ignores invalid inputs and returns empty array', () => {
    expect(applyCollisionChain(null, 0)).toEqual([])
    expect(applyCollisionChain([], 0)).toEqual([])
    expect(applyCollisionChain('not-an-array', 0)).toEqual([])

    const alice = new PlayerState('Alice')
    expect(applyCollisionChain([alice], '0')).toEqual([])
    expect(applyCollisionChain([alice], 1.5)).toEqual([])
    expect(applyCollisionChain([alice], -1)).toEqual([])
    expect(applyCollisionChain([alice], 1)).toEqual([])
  })

  it('prevents all collisions when truce option is true', () => {
    const alice = new PlayerState('Alice')
    const bob = new PlayerState('Bob')
    alice.score = 1000
    bob.score = 1000
    bob.checkpointHistory = [0, 500, 1000]

    const collisions = applyCollisionChain([alice, bob], 0, { truce: true })

    expect(collisions).toEqual([])
    expect(bob.score).toBe(1000)
  })

  it('skips candidates who have ghost status immunity', () => {
    const alice = new PlayerState('Alice')
    const bob = new PlayerState('Bob')
    const charlie = new PlayerState('Charlie')

    alice.score = 1000
    bob.score = 1000
    bob.checkpointHistory = [0, 500, 1000]
    bob.status.ghost = true

    charlie.score = 1000
    charlie.checkpointHistory = [0, 600, 1000]

    const collisions = applyCollisionChain([alice, bob, charlie], 0)

    expect(bob.score).toBe(1000)
    expect(charlie.score).toBe(600)
    expect(collisions).toHaveLength(1)
    expect(collisions[0].victimIndex).toBe(2)
  })

  it('supports directDropCount: 2 (Sniper) while cascades drop by 1', () => {
    const alice = new PlayerState('Alice')
    const bob = new PlayerState('Bob')
    const charlie = new PlayerState('Charlie')

    alice.score = 2000

    bob.score = 2000
    bob.checkpointHistory = [0, 500, 1200, 2000]

    charlie.score = 500
    charlie.checkpointHistory = [0, 200, 500]

    const collisions = applyCollisionChain([alice, bob, charlie], 0, {
      directDropCount: 2,
      cascadeDropCount: 1,
    })

    expect(bob.score).toBe(500)
    expect(charlie.score).toBe(200)
    expect(collisions).toEqual([
      {
        victimIndex: 1,
        attackerIndex: 0,
        player: 'Bob',
        attacker: 'Alice',
        from: 2000,
        to: 500,
        isDirect: true,
      },
      {
        victimIndex: 2,
        attackerIndex: 1,
        player: 'Charlie',
        attacker: 'Bob',
        from: 500,
        to: 200,
        isDirect: false,
      },
    ])
  })

  it('supports directDropCount: 2 and cascadeDropCount: 2 (Tempête)', () => {
    const alice = new PlayerState('Alice')
    const bob = new PlayerState('Bob')
    const charlie = new PlayerState('Charlie')

    alice.score = 3000

    bob.score = 3000
    bob.checkpointHistory = [0, 1000, 2000, 3000]

    charlie.score = 1000
    charlie.checkpointHistory = [0, 200, 500, 1000]

    const collisions = applyCollisionChain([alice, bob, charlie], 0, {
      directDropCount: 2,
      cascadeDropCount: 2,
    })

    expect(bob.score).toBe(1000)
    expect(charlie.score).toBe(200)
    expect(collisions).toHaveLength(2)
    expect(collisions[0].to).toBe(1000)
    expect(collisions[1].to).toBe(200)
  })

  it('ignores collisions when players are at score 0 or drop to 0', () => {
    const alice = new PlayerState('Alice')
    const bob = new PlayerState('Bob')
    const charlie = new PlayerState('Charlie')

    alice.score = 500

    bob.score = 500
    bob.checkpointHistory = [0, 500]

    charlie.score = 0
    charlie.checkpointHistory = [0]

    const collisions = applyCollisionChain([alice, bob, charlie], 0)

    expect(bob.score).toBe(0)
    expect(charlie.score).toBe(0)
    expect(collisions).toHaveLength(1)
    expect(collisions[0].victimIndex).toBe(1)
  })

  it('does nothing if the triggering player has score <= 0', () => {
    const alice = new PlayerState('Alice')
    const bob = new PlayerState('Bob')

    alice.score = 0
    bob.score = 0

    const collisions = applyCollisionChain([alice, bob], 0)
    expect(collisions).toEqual([])
  })

  it('falls back to dropToPreviousCheckpoint when dropMultipleCheckpoints is not a function', () => {
    const alice = new PlayerState('Alice')
    alice.score = 800

    const mockBob = {
      name: 'Bob',
      score: 800,
      dropToPreviousCheckpoint() {
        this.score = 400
      },
    }

    const collisions = applyCollisionChain([alice, mockBob], 0)

    expect(mockBob.score).toBe(400)
    expect(collisions).toEqual([
      {
        victimIndex: 1,
        attackerIndex: 0,
        player: 'Bob',
        attacker: 'Alice',
        from: 800,
        to: 400,
        isDirect: true,
      },
    ])
  })

  it('handles candidate whose score does not change upon drop', () => {
    const alice = new PlayerState('Alice')
    alice.score = 600

    const staticBob = {
      name: 'Bob',
      score: 600,
      dropToPreviousCheckpoint() {
        // Does not change score
      },
    }

    const collisions = applyCollisionChain([alice, staticBob], 0)
    expect(collisions).toEqual([])
    expect(staticBob.score).toBe(600)
  })

  it('handles null options argument without crashing', () => {
    const alice = new PlayerState('Alice')
    const bob = new PlayerState('Bob')
    alice.score = 1000
    bob.score = 1000
    bob.checkpointHistory = [0, 500, 1000]

    const collisions = applyCollisionChain([alice, bob], 0, null)
    expect(collisions).toHaveLength(1)
    expect(bob.score).toBe(500)
  })
})
