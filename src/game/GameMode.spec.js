import { describe, expect, it } from 'vitest'
import { CENT_MILLE, QUICK_10K, resolveGameMode } from './GameMode.js'

describe('GameMode', () => {
  it('defines QUICK_10K mode with accurate presets', () => {
    expect(QUICK_10K).toEqual({
      id: 'quick-10k',
      targetScore: 10000,
      openingScore: 500,
      tierInterval: null,
      jokersEnabled: false,
      magicNumbersEnabled: false,
      achievementsEnabled: false,
      tableEventsEnabled: false,
      redZoneEnabled: false,
      redZoneThreshold: null,
      shopEnabled: false,
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
    })
  })

  it('resolves default configuration as QUICK_10K without options', () => {
    const config = resolveGameMode()
    expect(config).toEqual(QUICK_10K)
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
})
