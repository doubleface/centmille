import { describe, expect, it } from 'vitest'
import { findSound } from '../sound/sounds.js'
import {
  checkMagicNumber,
  getMagicNumbersForMode,
  MAGIC_NUMBERS,
  MAGIC_SCORES_BY_MODE,
} from './magicNumbers.js'

describe('magicNumbers', () => {
  it('contains exactly 7 magic numbers definitions', () => {
    expect(MAGIC_NUMBERS).toHaveLength(7)
    const ids = MAGIC_NUMBERS.map((m) => m.id)
    expect(ids).toEqual([
      'lucky-repdigit',
      'ascending',
      'exact-tier',
      'devil',
      'answer-42',
      'black-cat',
      'jackpot',
    ])
  })

  it('exports MAGIC_SCORES_BY_MODE for dix-mille-bonus', () => {
    expect(MAGIC_SCORES_BY_MODE).toEqual({
      'dix-mille-bonus': {
        5000: 'exact-tier',
        6600: 'devil',
        7700: 'jackpot',
      },
    })
  })

  it('validates schema and sounds of all magic numbers', () => {
    for (const magic of MAGIC_NUMBERS) {
      expect(typeof magic.id).toBe('string')
      expect(magic.name).toContain(magic.emoji)
      expect(typeof magic.description).toBe('string')
      expect(typeof magic.matches).toBe('function')

      const sound = findSound(magic.soundId)
      expect(sound, `Sound ${magic.soundId} not found in sounds.js`).not.toBeNull()
    }
  })

  it('correctly matches lucky-repdigit in cent-mille mode', () => {
    for (const score of [11100, 22200, 33300, 44400, 55500, 88800, 99900]) {
      const match = checkMagicNumber(score)
      expect(match?.id).toBe('lucky-repdigit')
    }
    // Excluded from lucky repdigit: 66600 (devil) and 77700 (jackpot)
    expect(checkMagicNumber(66600)?.id).toBe('devil')
    expect(checkMagicNumber(77700)?.id).toBe('jackpot')
  })

  it('correctly matches ascending suite in cent-mille mode', () => {
    for (const score of [12300, 23400, 34500, 45600, 56700, 67800, 78900]) {
      const match = checkMagicNumber(score)
      expect(match?.id).toBe('ascending')
    }
  })

  it('correctly matches exact tiers in cent-mille mode', () => {
    for (const score of [20000, 40000, 60000, 80000]) {
      const match = checkMagicNumber(score)
      expect(match?.id).toBe('exact-tier')
    }
  })

  it('correctly matches answer-42 across all balanced tiers in cent-mille mode', () => {
    for (const score of [24000, 42000, 42400, 84000]) {
      const match = checkMagicNumber(score)
      expect(match?.id).toBe('answer-42')
    }
  })

  it('correctly matches black-cat across all balanced tiers in cent-mille mode', () => {
    for (const score of [13000, 31300, 51300, 71300, 91300]) {
      const match = checkMagicNumber(score)
      expect(match?.id).toBe('black-cat')
    }
  })

  it('returns null when score is not a magic number in cent-mille mode', () => {
    expect(checkMagicNumber(0)).toBeNull()
    expect(checkMagicNumber(500)).toBeNull()
    expect(checkMagicNumber(12000)).toBeNull()
    expect(checkMagicNumber(25000)).toBeNull()
    expect(checkMagicNumber(100000)).toBeNull()
  })

  it('correctly evaluates scores in dix-mille-bonus mode', () => {
    expect(checkMagicNumber(5000, 'dix-mille-bonus')?.id).toBe('exact-tier')
    expect(checkMagicNumber(6600, 'dix-mille-bonus')?.id).toBe('devil')
    expect(checkMagicNumber(7700, 'dix-mille-bonus')?.id).toBe('jackpot')

    // Cent-mille magic numbers are not active in dix-mille-bonus
    expect(checkMagicNumber(66600, 'dix-mille-bonus')).toBeNull()
    expect(checkMagicNumber(77700, 'dix-mille-bonus')).toBeNull()
    expect(checkMagicNumber(20000, 'dix-mille-bonus')).toBeNull()
    expect(checkMagicNumber(11100, 'dix-mille-bonus')).toBeNull()
    expect(checkMagicNumber(0, 'dix-mille-bonus')).toBeNull()
  })

  it('falls back to cent-mille matching for unknown mode', () => {
    expect(checkMagicNumber(66600, 'unknown-mode')?.id).toBe('devil')
  })

  describe('getMagicNumbersForMode', () => {
    it('returns 3 magic numbers for dix-mille-bonus', () => {
      const list = getMagicNumbersForMode('dix-mille-bonus')
      expect(list).toHaveLength(3)
      expect(list.map((m) => m.id)).toEqual(['exact-tier', 'devil', 'jackpot'])
    })

    it('returns all 7 magic numbers for cent-mille or unknown mode', () => {
      expect(getMagicNumbersForMode('cent-mille')).toHaveLength(7)
      expect(getMagicNumbersForMode()).toHaveLength(7)
      expect(getMagicNumbersForMode('unknown')).toHaveLength(7)
    })
  })
})
