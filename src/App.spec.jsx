// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import {
  REVEALABLE_EVENT_TYPES,
  buildCollisionReviewQueue,
  buildRevealQueue,
  buildRowsByPlayer,
  playDowngradeSound,
  preloadCardImages,
} from './App.jsx'

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

  it('handles shield-used by restoring isDowngraded to false', () => {
    const snapshot = {
      players: [{ name: 'Alice', score: 1200 }],
      events: [
        { type: 'score', player: 'Alice', cumulative: 1200 },
        { type: 'downgrade', player: 'Alice', from: 1200, to: 500 },
        { type: 'shield-used', player: 'Alice' },
      ],
    }

    const rowsByPlayer = buildRowsByPlayer(snapshot)
    expect(rowsByPlayer.Alice).toHaveLength(1)
    expect(rowsByPlayer.Alice[0]).toMatchObject({
      label: '1200',
      isDowngraded: false,
    })
  })

  it('handles parachute-used by pushing a new row with the cushioned score', () => {
    const snapshot = {
      players: [{ name: 'Alice', score: 800 }],
      events: [
        { type: 'score', player: 'Alice', cumulative: 1200 },
        { type: 'downgrade', player: 'Alice', from: 1200, to: 500 },
        { type: 'parachute-used', player: 'Alice', score: 800 },
      ],
    }

    const rowsByPlayer = buildRowsByPlayer(snapshot)
    expect(rowsByPlayer.Alice).toHaveLength(2)
    expect(rowsByPlayer.Alice[0]).toMatchObject({
      label: '1200',
      isDowngraded: true,
    })
    expect(rowsByPlayer.Alice[1]).toMatchObject({
      label: '800',
      isDowngraded: false,
    })
  })

  it('adjusts active row when player.score differs from last active row (e.g. pickpocket, boutique)', () => {
    const snapshot = {
      players: [{ name: 'Alice', score: 1100 }, { name: 'Bob', score: 400 }],
      events: [
        { type: 'score', player: 'Alice', cumulative: 1000 },
        { type: 'score', player: 'Bob', cumulative: 500 },
      ],
    }

    // Alice gained 100 (vampire), Bob lost 100
    const rowsByPlayer = buildRowsByPlayer(snapshot)

    expect(rowsByPlayer.Alice).toHaveLength(2)
    expect(rowsByPlayer.Alice[0].isDowngraded).toBe(true)
    expect(rowsByPlayer.Alice[1]).toMatchObject({ label: '1100', isDowngraded: false })

    expect(rowsByPlayer.Bob).toHaveLength(2)
    expect(rowsByPlayer.Bob[0].isDowngraded).toBe(true)
    expect(rowsByPlayer.Bob[1]).toMatchObject({ label: '400', isDowngraded: false })
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
    expect(buildCollisionReviewQueue(null)).toEqual([])
  })

  it('builds reveal queue filtering only revealable events', () => {
    expect(buildRevealQueue(null)).toEqual([])

    const actionEvents = [
      { type: 'card-drawn', player: 'Alice', cardId: 'bouclier' },
      { type: 'score', player: 'Alice', cumulative: 1000 },
      { type: 'magic-number', player: 'Alice', magicId: 'ascending' },
      { type: 'table-event', eventId: 'happy-hour' },
      { type: 'achievement', achievementId: 'premier-sang' },
      { type: 'consolation', player: 'Bob', cardId: 'reset' },
      { type: 'bounty-claimed', hunter: 'Alice', leader: 'Bob' },
      { type: 'crown-changed', player: 'Alice' },
      { type: 'red-zone', player: 'Alice' },
      { type: 'bomb-exploded', player: 'Bob' },
      { type: 'pandora-curse', player: 'Alice' },
      { type: 'boomerang', player: 'Alice', attacker: 'Bob' },
      { type: 'card-played', player: 'Alice', cardId: 'gel' },
      { type: 'downgrade', player: 'Bob', from: 1000, to: 500 },
    ]

    const queue = buildRevealQueue(actionEvents)
    expect(queue).toHaveLength(12)
    expect(queue.map((e) => e.type)).toEqual([
      'card-drawn',
      'magic-number',
      'table-event',
      'achievement',
      'consolation',
      'bounty-claimed',
      'crown-changed',
      'red-zone',
      'bomb-exploded',
      'pandora-curse',
      'boomerang',
      'card-played',
    ])
    expect(REVEALABLE_EVENT_TYPES).toHaveLength(12)
  })

  it('handles null snapshot and initial bust before any score', () => {
    expect(buildRowsByPlayer(null)).toEqual({})

    const rowsByPlayer = buildRowsByPlayer({
      players: [{ name: 'Alice' }, { name: 'Bob' }],
      events: [{ type: 'bust', player: 'Alice' }],
    })
    expect(rowsByPlayer.Alice).toEqual([
      { label: '—', variant: 'normal', isDowngraded: false, bustCount: 1 },
    ])
  })

  it('synthesizes the dramatic downgrade sound when AudioContext is available', () => {
    const startMock = vi.fn()
    const stopMock = vi.fn()
    const connectMock = vi.fn()

    window.AudioContext = class {
      currentTime = 0
      destination = {}
      createGain() {
        return {
          gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
          connect: connectMock,
        }
      }
      createOscillator() {
        return {
          type: 'sine',
          frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
          connect: connectMock,
          start: startMock,
          stop: stopMock,
        }
      }
    }

    playDowngradeSound()

    expect(startMock).toHaveBeenCalledTimes(8)
    expect(stopMock).toHaveBeenCalledTimes(8)
    delete window.AudioContext
  })

  it('preloads card images sequentially one by one and reports progress', () => {
    const loadedUrls = []
    const progressEvents = []
    const originalImage = window.Image

    window.Image = class {
      set src(url) {
        loadedUrls.push(url)
        if (url === '/cards/fail.jpg') {
          this.onerror?.()
        } else {
          this.onload?.()
        }
      }
    }

    preloadCardImages(
      [
        { image: '/cards/one.jpg' },
        { image: '' },
        { image: '/cards/fail.jpg' },
        { image: '/cards/two.jpg' },
      ],
      (status) => progressEvents.push(status)
    )

    expect(loadedUrls).toEqual(['/cards/one.jpg', '/cards/fail.jpg', '/cards/two.jpg'])
    expect(progressEvents).toEqual([
      { loaded: 0, processed: 0, total: 3, done: false },
      { loaded: 1, processed: 1, total: 3, done: false },
      { loaded: 1, processed: 2, total: 3, done: false },
      { loaded: 2, processed: 3, total: 3, done: true },
    ])

    window.Image = null
    preloadCardImages([{ image: '/cards/three.jpg' }])
    expect(loadedUrls).toHaveLength(3)

    window.Image = originalImage
  })
})
