import { describe, expect, it } from 'vitest'
import { CENT_MILLE, DIX_MILLE_BONUS, isBonusMode, QUICK_10K, resolveGameMode } from './GameMode.js'

describe('GameMode', () => {
  it('defines QUICK_10K mode with accurate presets', () => {
    expect(QUICK_10K).toEqual({
      id: 'quick-10k',
      targetScore: 10000,
      openingScore: 500,
      tierInterval: null,
      tiers: [],
      jokersEnabled: false,
      magicNumbersEnabled: false,
      achievementsEnabled: false,
      tableEventsEnabled: false,
      redZoneEnabled: false,
      redZoneThreshold: null,
      shopEnabled: false,
      handLimit: 3,
      rarityWeights: {
        common: 0.6,
        rare: 0.3,
        legendary: 0.1,
      },
      deckCardIds: null,
      allowedTableEventIds: null,
      allowedAchievementIds: null,
      periodicTableEventsEnabled: false,
      crownEnabled: false,
      redZoneSabotageEnabled: false,
      consolationProbability: 0,
      consolationCollisionOnly: false,
      pickpocketAmount: 1000,
      welcomeCardThreshold: null,
    })
  })

  it('defines CENT_MILLE mode with accurate presets', () => {
    expect(CENT_MILLE).toEqual({
      id: 'cent-mille',
      targetScore: 100000,
      openingScore: 500,
      tierInterval: 20000,
      tiers: [20000, 40000, 60000, 80000],
      jokersEnabled: true,
      magicNumbersEnabled: true,
      achievementsEnabled: true,
      tableEventsEnabled: true,
      redZoneEnabled: true,
      redZoneThreshold: 90000,
      shopEnabled: true,
      handLimit: 3,
      rarityWeights: {
        common: 0.6,
        rare: 0.3,
        legendary: 0.1,
      },
      deckCardIds: null,
      allowedTableEventIds: null,
      allowedAchievementIds: null,
      periodicTableEventsEnabled: true,
      crownEnabled: true,
      redZoneSabotageEnabled: true,
      consolationProbability: 1 / 3,
      consolationCollisionOnly: false,
      pickpocketAmount: 1000,
      welcomeCardThreshold: null,
    })
  })

  it('defines DIX_MILLE_BONUS mode with accurate presets', () => {
    expect(DIX_MILLE_BONUS).toEqual({
      id: 'dix-mille-bonus',
      targetScore: 10000,
      openingScore: 500,
      tierInterval: 5000,
      tiers: [5000],
      jokersEnabled: true,
      magicNumbersEnabled: true,
      achievementsEnabled: true,
      tableEventsEnabled: true,
      redZoneEnabled: true,
      redZoneThreshold: 9000,
      shopEnabled: false,
      handLimit: 2,
      rarityWeights: {
        common: 0.65,
        rare: 0.3,
        legendary: 0.05,
      },
      deckCardIds: [
        'arrondi',
        'convertisseur',
        'reset',
        'effaceur',
        'assurance',
        'petite-suite',
        'annonceur',
        'bouclier',
        'doubleur',
        'seconde-chance',
        'sixieme-sens',
        'gel',
        'malediction',
        'pickpocket',
        'cameleon',
        'miroir',
        'bis',
      ],
      allowedTableEventIds: [
        'happy-hour',
        'tour-eclair',
        'fete-des-2',
        'treve',
        'pluie-de-cartes',
        'sens-inverse',
      ],
      allowedAchievementIds: ['premier-sang', 'miracule', 'coup-declat'],
      periodicTableEventsEnabled: false,
      crownEnabled: false,
      redZoneSabotageEnabled: false,
      consolationProbability: 0.5,
      consolationCollisionOnly: true,
      pickpocketAmount: 500,
      welcomeCardThreshold: 1000,
    })
    expect(Object.isFrozen(DIX_MILLE_BONUS)).toBe(true)
    expect(Object.isFrozen(DIX_MILLE_BONUS.tiers)).toBe(true)
    expect(Object.isFrozen(DIX_MILLE_BONUS.rarityWeights)).toBe(true)
    expect(Object.isFrozen(DIX_MILLE_BONUS.deckCardIds)).toBe(true)
    expect(Object.isFrozen(DIX_MILLE_BONUS.allowedTableEventIds)).toBe(true)
    expect(Object.isFrozen(DIX_MILLE_BONUS.allowedAchievementIds)).toBe(true)
  })

  it('resolves default configuration as QUICK_10K without options', () => {
    const config = resolveGameMode()
    expect(config).toEqual(QUICK_10K)
    expect(config.tiers).not.toBe(QUICK_10K.tiers)
  })

  it('resolves QUICK_10K when passing null or empty object', () => {
    expect(resolveGameMode(null)).toEqual(QUICK_10K)
    expect(resolveGameMode({})).toEqual(QUICK_10K)
  })

  it('allows overrides for targetScore and openingScore in default quick-10k mode', () => {
    const config = resolveGameMode({
      targetScore: 5000,
      openingScore: 300,
    })

    expect(config).toEqual({
      ...QUICK_10K,
      targetScore: 5000,
      openingScore: 300,
    })
  })

  it('resolves CENT_MILLE when mode is "cent-mille"', () => {
    const config = resolveGameMode({ mode: 'cent-mille' })
    expect(config).toEqual(CENT_MILLE)
    expect(config.tiers).not.toBe(CENT_MILLE.tiers)
    expect(config.rarityWeights).not.toBe(CENT_MILLE.rarityWeights)
  })

  it('allows overrides for cent-mille mode parameters', () => {
    const config = resolveGameMode({
      mode: 'cent-mille',
      targetScore: 80000,
      openingScore: 1000,
      redZoneEnabled: false,
      shopEnabled: false,
    })

    expect(config).toEqual({
      ...CENT_MILLE,
      targetScore: 80000,
      openingScore: 1000,
      redZoneEnabled: false,
      shopEnabled: false,
    })
  })

  it('resolves DIX_MILLE_BONUS when mode is "dix-mille-bonus" with mutable copies', () => {
    const config = resolveGameMode({ mode: 'dix-mille-bonus' })
    expect(config).toEqual(DIX_MILLE_BONUS)
    expect(config.tiers).not.toBe(DIX_MILLE_BONUS.tiers)
    expect(config.rarityWeights).not.toBe(DIX_MILLE_BONUS.rarityWeights)
    expect(config.deckCardIds).not.toBe(DIX_MILLE_BONUS.deckCardIds)
    expect(config.allowedTableEventIds).not.toBe(DIX_MILLE_BONUS.allowedTableEventIds)
    expect(config.allowedAchievementIds).not.toBe(DIX_MILLE_BONUS.allowedAchievementIds)
  })

  it('allows overrides for dix-mille-bonus mode parameters', () => {
    const config = resolveGameMode({
      mode: 'dix-mille-bonus',
      targetScore: 15000,
      openingScore: 1000,
    })

    expect(config.targetScore).toBe(15000)
    expect(config.openingScore).toBe(1000)
    expect(config.tierInterval).toBe(5000)
  })

  describe('isBonusMode', () => {
    it('returns true for bonus modes and false for others', () => {
      expect(isBonusMode('cent-mille')).toBe(true)
      expect(isBonusMode('dix-mille-bonus')).toBe(true)
      expect(isBonusMode('quick-10k')).toBe(false)
      expect(isBonusMode(undefined)).toBe(false)
      expect(isBonusMode('unknown-mode')).toBe(false)
    })
  })
})
