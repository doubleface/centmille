// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { buildCollisionReviewQueue, buildRowsByPlayer } from './App.jsx'

describe('buildRowsByPlayer', () => {
  it('bars a score without re-displaying the previous score', () => {
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

    // No re-display: single row, score barred, bust marks cleared
    expect(rowsByPlayer.Alice).toHaveLength(1)
    expect(rowsByPlayer.Alice[0]).toMatchObject({
      label: '1200',
      isDowngraded: true,
      bustCount: 0,
    })
  })

  it('bars a score and clears the bust marks on that score', () => {
    const snapshot = {
      players: [{ name: 'Alice' }, { name: 'Bob' }],
      events: [
        { type: 'score', player: 'Alice', cumulative: 1200 },
        { type: 'bust', player: 'Alice' },
        { type: 'bust', player: 'Alice' },
        { type: 'bust', player: 'Alice' },
        { type: 'downgrade', player: 'Alice', from: 1200, to: 1200 },
      ],
    }

    const rowsByPlayer = buildRowsByPlayer(snapshot)

    // Score is barred, bust marks are cleared
    expect(rowsByPlayer.Alice).toHaveLength(1)
    expect(rowsByPlayer.Alice[0]).toMatchObject({
      label: '1200',
      isDowngraded: true,
      bustCount: 0,
    })
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
