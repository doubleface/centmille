import { describe, expect, it } from 'vitest'
import { findSound } from '../sound/sounds.js'
import { ACHIEVEMENTS, evaluateAchievements, findAchievement } from './achievements.js'

describe('achievements', () => {
  it('contains exactly 6 achievements', () => {
    expect(ACHIEVEMENTS).toHaveLength(6)
    const ids = ACHIEVEMENTS.map((a) => a.id)
    expect(ids).toEqual([
      'coup-declat',
      'premier-sang',
      'phenix',
      'remontada',
      'miracule',
      'bourreau',
    ])
  })

  it('validates schema and sounds of all achievements', () => {
    for (const achievement of ACHIEVEMENTS) {
      expect(typeof achievement.id).toBe('string')
      expect(achievement.emoji).toBe('🏆')
      expect(achievement.soundId).toBe('achievement')
      expect(typeof achievement.description).toBe('string')
      expect(typeof achievement.name).toBe('string')

      const sound = findSound(achievement.soundId)
      expect(sound).not.toBeNull()
    }
  })

  it('findAchievement finds achievement or returns null', () => {
    expect(findAchievement('coup-declat')?.name).toBe("Coup d'éclat")
    expect(findAchievement('unknown')).toBeNull()
  })

  describe('evaluateAchievements', () => {
    it('returns empty array when no conditions are met', () => {
      expect(evaluateAchievements()).toEqual([])
      expect(
        evaluateAchievements({
          turnScore: 500,
          collisionsCount: 0,
          isFirstBloodOfGame: false,
          recoveredFromDrop: false,
          wasUniqueLastBeforeTurn: false,
          isUniqueFirstAfterTurn: false,
          failedTurnsBeforeTurn: 0,
          alreadyUnlockedIds: [],
        })
      ).toEqual([])
    })

    it('evaluates coup-declat (turnScore >= 2000 and !coupDeclatAlreadyAwarded)', () => {
      const below = evaluateAchievements({ turnScore: 1900 })
      expect(below).toEqual([])

      const exact = evaluateAchievements({ turnScore: 2000 })
      expect(exact.map((a) => a.id)).toEqual(['coup-declat'])

      const above = evaluateAchievements({ turnScore: 3500 })
      expect(above.map((a) => a.id)).toEqual(['coup-declat'])

      const alreadyAwarded = evaluateAchievements({
        turnScore: 3500,
        coupDeclatAlreadyAwarded: true,
      })
      expect(alreadyAwarded).toEqual([])
    })

    it('evaluates premier-sang (isFirstBloodOfGame === true)', () => {
      const result = evaluateAchievements({ isFirstBloodOfGame: true })
      expect(result.map((a) => a.id)).toEqual(['premier-sang'])
    })

    it('evaluates phenix (recoveredFromDrop === true)', () => {
      const result = evaluateAchievements({ recoveredFromDrop: true })
      expect(result.map((a) => a.id)).toEqual(['phenix'])
    })

    it('evaluates remontada (wasUniqueLastBeforeTurn && isUniqueFirstAfterTurn)', () => {
      expect(
        evaluateAchievements({ wasUniqueLastBeforeTurn: true, isUniqueFirstAfterTurn: false })
      ).toEqual([])
      expect(
        evaluateAchievements({ wasUniqueLastBeforeTurn: false, isUniqueFirstAfterTurn: true })
      ).toEqual([])

      const result = evaluateAchievements({
        wasUniqueLastBeforeTurn: true,
        isUniqueFirstAfterTurn: true,
      })
      expect(result.map((a) => a.id)).toEqual(['remontada'])
    })

    it('evaluates miracule (failedTurnsBeforeTurn === 2 && turnScore > 0)', () => {
      expect(evaluateAchievements({ failedTurnsBeforeTurn: 1, turnScore: 1000 })).toEqual([])
      expect(evaluateAchievements({ failedTurnsBeforeTurn: 2, turnScore: 0 })).toEqual([])

      const result = evaluateAchievements({
        failedTurnsBeforeTurn: 2,
        turnScore: 500,
      })
      expect(result.map((a) => a.id)).toEqual(['miracule'])
    })

    it('evaluates bourreau (collisionsCount >= 2)', () => {
      expect(evaluateAchievements({ collisionsCount: 1 })).toEqual([])

      const result = evaluateAchievements({ collisionsCount: 2 })
      expect(result.map((a) => a.id)).toEqual(['bourreau'])

      const result3 = evaluateAchievements({ collisionsCount: 3 })
      expect(result3.map((a) => a.id)).toEqual(['bourreau'])
    })

    it('filters out already unlocked achievements', () => {
      const result = evaluateAchievements({
        turnScore: 2500,
        collisionsCount: 2,
        alreadyUnlockedIds: ['coup-declat'],
      })
      expect(result.map((a) => a.id)).toEqual(['bourreau'])
    })

    it('can unlock multiple achievements in one turn', () => {
      const result = evaluateAchievements({
        turnScore: 3000,
        collisionsCount: 2,
        isFirstBloodOfGame: true,
        recoveredFromDrop: true,
        wasUniqueLastBeforeTurn: true,
        isUniqueFirstAfterTurn: true,
        failedTurnsBeforeTurn: 2,
      })
      expect(result.map((a) => a.id)).toEqual([
        'coup-declat',
        'premier-sang',
        'phenix',
        'remontada',
        'miracule',
        'bourreau',
      ])
    })

    it('restricts unlocked achievements when allowedIds is specified', () => {
      const result = evaluateAchievements({
        turnScore: 3000,
        collisionsCount: 2,
        isFirstBloodOfGame: true,
        recoveredFromDrop: true,
        wasUniqueLastBeforeTurn: true,
        isUniqueFirstAfterTurn: true,
        failedTurnsBeforeTurn: 2,
        allowedIds: ['premier-sang', 'miracule', 'coup-declat'],
      })
      expect(result.map((a) => a.id)).toEqual(['coup-declat', 'premier-sang', 'miracule'])
    })

    it('returns empty array when allowedIds does not match any triggered achievements', () => {
      const result = evaluateAchievements({
        turnScore: 3000,
        allowedIds: ['premier-sang'],
      })
      expect(result).toEqual([])
    })
  })
})
