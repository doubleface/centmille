export const QUICK_10K = Object.freeze({
  id: 'quick-10k',
  targetScore: 10000,
  openingScore: 500,
  tierInterval: null,
  tiers: Object.freeze([]),
  jokersEnabled: false,
  magicNumbersEnabled: false,
  achievementsEnabled: false,
  tableEventsEnabled: false,
  redZoneEnabled: false,
  redZoneThreshold: null,
  shopEnabled: false,
  handLimit: 3,
  rarityWeights: Object.freeze({
    common: 0.6,
    rare: 0.3,
    legendary: 0.1,
  }),
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
  handLimit: 3,
  rarityWeights: Object.freeze({
    common: 0.6,
    rare: 0.3,
    legendary: 0.1,
  }),
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

export const DIX_MILLE_BONUS = Object.freeze({
  id: 'dix-mille-bonus',
  targetScore: 10000,
  openingScore: 500,
  tierInterval: 5000,
  tiers: Object.freeze([5000]),
  jokersEnabled: true,
  magicNumbersEnabled: true,
  achievementsEnabled: true,
  tableEventsEnabled: true,
  redZoneEnabled: true,
  redZoneThreshold: 9000,
  shopEnabled: false,
  handLimit: 2,
  rarityWeights: Object.freeze({
    common: 0.65,
    rare: 0.3,
    legendary: 0.05,
  }),
  deckCardIds: Object.freeze([
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
  ]),
  allowedTableEventIds: Object.freeze([
    'happy-hour',
    'tour-eclair',
    'fete-des-2',
    'treve',
    'pluie-de-cartes',
    'sens-inverse',
  ]),
  allowedAchievementIds: Object.freeze(['premier-sang', 'miracule', 'coup-declat']),
  periodicTableEventsEnabled: false,
  crownEnabled: false,
  redZoneSabotageEnabled: false,
  consolationProbability: 0.5,
  consolationCollisionOnly: true,
  pickpocketAmount: 500,
  welcomeCardThreshold: 1000,
})

function cloneMode(base) {
  return {
    ...base,
    tiers: [...base.tiers],
    rarityWeights: { ...base.rarityWeights },
    deckCardIds: base.deckCardIds ? [...base.deckCardIds] : null,
    allowedTableEventIds: base.allowedTableEventIds ? [...base.allowedTableEventIds] : null,
    allowedAchievementIds: base.allowedAchievementIds ? [...base.allowedAchievementIds] : null,
  }
}

export function resolveGameMode(options = {}) {
  const opts = options ?? {}

  if (opts.mode === 'cent-mille') {
    return {
      ...cloneMode(CENT_MILLE),
      targetScore: opts.targetScore ?? CENT_MILLE.targetScore,
      openingScore: opts.openingScore ?? CENT_MILLE.openingScore,
      redZoneEnabled: opts.redZoneEnabled ?? CENT_MILLE.redZoneEnabled,
      shopEnabled: opts.shopEnabled ?? CENT_MILLE.shopEnabled,
    }
  }

  if (opts.mode === 'dix-mille-bonus') {
    return {
      ...cloneMode(DIX_MILLE_BONUS),
      targetScore: opts.targetScore ?? DIX_MILLE_BONUS.targetScore,
      openingScore: opts.openingScore ?? DIX_MILLE_BONUS.openingScore,
    }
  }

  return {
    ...cloneMode(QUICK_10K),
    targetScore: opts.targetScore ?? QUICK_10K.targetScore,
    openingScore: opts.openingScore ?? QUICK_10K.openingScore,
  }
}

export const isBonusMode = (modeId) => resolveGameMode({ mode: modeId }).jokersEnabled
