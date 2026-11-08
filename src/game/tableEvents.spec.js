import { describe, expect, it } from 'vitest'
import { findSound } from '../sound/sounds.js'
import { drawTableEvent, findTableEvent, TABLE_EVENTS } from './tableEvents.js'

describe('tableEvents', () => {
  it('contains exactly 8 table events', () => {
    expect(TABLE_EVENTS).toHaveLength(8)
    const ids = TABLE_EVENTS.map((e) => e.id)
    expect(ids).toEqual([
      'happy-hour',
      'tempete',
      'fete-des-2',
      'treve',
      'sens-inverse',
      'pluie-de-cartes',
      'mutinerie',
      'tour-eclair',
    ])
  })

  it('validates schema, sound and integrity of all table events', () => {
    const validTypes = new Set(['declarative', 'auto'])

    for (const event of TABLE_EVENTS) {
      expect(typeof event.id).toBe('string')
      expect(event.name).toContain(event.emoji)
      expect(validTypes.has(event.type)).toBe(true)
      expect(event.soundId).toBe('table-event')
      expect(typeof event.description).toBe('string')

      const sound = findSound(event.soundId)
      expect(sound).not.toBeNull()
    }
  })

  it('findTableEvent returns matching event or null', () => {
    expect(findTableEvent('happy-hour')?.name).toBe('🍹 Happy Hour')
    expect(findTableEvent('unknown-event')).toBeNull()
  })

  describe('drawTableEvent', () => {
    it('picks events based on rng', () => {
      expect(drawTableEvent(() => 0)?.id).toBe('happy-hour')
      expect(drawTableEvent(() => 0.15)?.id).toBe('tempete')
      expect(drawTableEvent(() => 0.999)?.id).toBe('tour-eclair')
    })

    it('works with default rng', () => {
      const event = drawTableEvent()
      expect(event).not.toBeNull()
      expect(TABLE_EVENTS.some((e) => e.id === event.id)).toBe(true)
    })

    it('filters events when allowedIds is specified', () => {
      const allowed = ['fete-des-2', 'treve']
      const event1 = drawTableEvent(() => 0, allowed)
      const event2 = drawTableEvent(() => 0.999, allowed)
      expect(event1?.id).toBe('fete-des-2')
      expect(event2?.id).toBe('treve')
    })

    it('returns null when allowedIds pool is empty', () => {
      expect(drawTableEvent(() => 0, [])).toBeNull()
      expect(drawTableEvent(() => 0, ['unknown-event'])).toBeNull()
    })
  })
})
