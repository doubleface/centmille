export const QUICK_10K = Object.freeze({
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

export const CENT_MILLE = Object.freeze({
  id: 'cent-mille',
  targetScore: 100000,
  openingScore: 500,
  tierInterval: 20000,
  tiers: Object.freeze([20000, 40000, 60000, 80000]),
  jokersEnabled: true,
  magicNumbersEnabled: true,
  achievementsEnabled: true,
  tableEventsEnabled: true,
  redZoneEnabled: true,
  redZoneThreshold: 90000,
  shopEnabled: true,
})

export function resolveGameMode(options = {}) {
  const opts = options ?? {}

  if (opts.mode === 'cent-mille') {
    return {
      ...CENT_MILLE,
      tiers: [...CENT_MILLE.tiers],
      targetScore: opts.targetScore ?? CENT_MILLE.targetScore,
      openingScore: opts.openingScore ?? CENT_MILLE.openingScore,
      redZoneEnabled: opts.redZoneEnabled ?? CENT_MILLE.redZoneEnabled,
      shopEnabled: opts.shopEnabled ?? CENT_MILLE.shopEnabled,
    }
  }

  return {
    ...QUICK_10K,
    targetScore: opts.targetScore ?? QUICK_10K.targetScore,
    openingScore: opts.openingScore ?? QUICK_10K.openingScore,
  }
}
