import { describe, expect, it } from 'vitest'
import { findSound } from '../sound/sounds.js'
import { checkMagicNumber, MAGIC_NUMBERS } from './magicNumbers.js'

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

  it('correctly matches lucky-repdigit', () => {
    for (const score of [11100, 22200, 33300, 44400, 55500, 88800, 99900]) {
      const match = checkMagicNumber(score)
      expect(match?.id).toBe('lucky-repdigit')
    }
    // Excluded from lucky repdigit: 66600 (devil) and 77700 (jackpot)
    expect(checkMagicNumber(66600)?.id).toBe('devil')
    expect(checkMagicNumber(77700)?.id).toBe('jackpot')
  })

  it('correctly matches ascending suite', () => {
    for (const score of [12300, 23400, 34500, 45600, 56700, 67800, 78900]) {
      const match = checkMagicNumber(score)
      expect(match?.id).toBe('ascending')
    }
  })

  it('correctly matches exact tiers', () => {
    for (const score of [20000, 40000, 60000, 80000]) {
      const match = checkMagicNumber(score)
      expect(match?.id).toBe('exact-tier')
    }
  })

  it('correctly matches answer-42 across all balanced tiers', () => {
    for (const score of [24000, 42000, 42400, 84000]) {
      const match = checkMagicNumber(score)
      expect(match?.id).toBe('answer-42')
    }
  })

  it('correctly matches black-cat across all balanced tiers', () => {
    for (const score of [13000, 31300, 51300, 71300, 91300]) {
      const match = checkMagicNumber(score)
      expect(match?.id).toBe('black-cat')
    }
  })

  it('returns null when score is not a magic number', () => {
    expect(checkMagicNumber(0)).toBeNull()
    expect(checkMagicNumber(500)).toBeNull()
    expect(checkMagicNumber(12000)).toBeNull()
    expect(checkMagicNumber(25000)).toBeNull()
    expect(checkMagicNumber(100000)).toBeNull()
  })
})
