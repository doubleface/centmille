// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { buildCollisionReviewQueue, buildRowsByPlayer } from './App.jsx'

describe('buildRowsByPlayer', () => {
  it('renders three failures as marks then appends downgrade score', () => {
    const snapshot = {
      players: [{ name: 'Alice' }, { name: 'Bob' }],
      events: [
        { type: 'score', player: 'Alice', cumulative: 1200 },
        { type: 'bust', player: 'Alice' },
        { type: 'bust', player: 'Alice' },
        { type: 'bust', player: 'Alice' },
        { type: 'downgrade', player: 'Alice', from: 1200, to: 500 },
      ],
    }

    const rowsByPlayer = buildRowsByPlayer(snapshot)

    expect(rowsByPlayer.Alice).toHaveLength(2)
    expect(rowsByPlayer.Alice[0]).toMatchObject({
      label: '1200',
      isDowngraded: true,
      bustCount: 3,
    })
    expect(rowsByPlayer.Alice[1]).toMatchObject({
      label: '500',
      isDowngraded: false,
      bustCount: 0,
    })
  })

  it('removes temporary failure marks when downgrade keeps same score', () => {
    const snapshot = {
      players: [{ name: 'Alice' }, { name: 'Bob' }],
      events: [
        { type: 'bust', player: 'Alice' },
        { type: 'bust', player: 'Alice' },
        { type: 'bust', player: 'Alice' },
        { type: 'downgrade', player: 'Alice', from: 0, to: 0 },
      ],
    }

    const rowsByPlayer = buildRowsByPlayer(snapshot)

    expect(rowsByPlayer.Alice).toEqual([])
  })

  it('builds a collision review queue for effective downgrades', () => {
    const actionEvents = [
      { type: 'score', player: 'Alice', cumulative: 1200 },
      { type: 'downgrade', player: 'Bob', from: 1800, to: 1000 },
      { type: 'downgrade', player: 'Charly', from: 500, to: 500 },
      { type: 'downgrade', player: 'Alice', from: 1200, to: 900 },
    ]

    expect(buildCollisionReviewQueue(actionEvents)).toEqual([
      { player: 'Bob', from: 1800, to: 1000 },
      { player: 'Alice', from: 1200, to: 900 },
    ])
  })
})
