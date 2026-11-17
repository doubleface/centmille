import { describe, expect, it } from 'vitest'
import { findSound } from '../sound/sounds.js'
import {
  CARDS,
  drawCardByRarity,
  drawDistinctCards,
  drawRandomCard,
  findCard,
  getCardDescriptions,
  pickRarity,
  RARITY_WEIGHTS,
} from './cardsCatalog.js'

describe('cardsCatalog', () => {
  it('exports valid RARITY_WEIGHTS', () => {
    expect(RARITY_WEIGHTS).toEqual({
      common: 0.6,
      rare: 0.3,
      legendary: 0.1,
    })
    expect(RARITY_WEIGHTS.common + RARITY_WEIGHTS.rare + RARITY_WEIGHTS.legendary).toBeCloseTo(1.0)
  })

  it('contains exactly 37 cards with architecte as privilege and 36 deck cards', () => {
    expect(CARDS).toHaveLength(37)

    const architecte = findCard('architecte')
    expect(architecte).not.toBeNull()
    expect(architecte?.inDeck).toBe(false)
    expect(architecte?.rarity).toBe('special')
    expect(architecte?.category).toBe('privilege')
    expect(architecte?.activation).toBe('automatic')
    expect(architecte?.isOffensive).toBe(false)

    const deckCards = CARDS.filter((c) => c.inDeck)
    expect(deckCards).toHaveLength(36)
  })

  it('validates every card schema and integrity', () => {
    const validRarities = new Set(['common', 'rare', 'legendary', 'special'])
    const validCategories = new Set([
      'defensive',
      'interactive',
      'declarative',
      'risk',
      'gage',
      'privilege',
    ])
    const validActivations = new Set([
      'passive-prompt',
      'pre-turn',
      'instant-target',
      'instant-self',
      'automatic',
    ])
    const offensiveIds = new Set([
      'sniper',
      'gel',
      'pickpocket',
      'malediction',
      'bombe',
      'duel',
      'main-faible',
      'aveugle',
      'annonceur',
    ])

    const seenIds = new Set()

    for (const card of CARDS) {
      expect(seenIds.has(card.id)).toBe(false)
      seenIds.add(card.id)

      expect(typeof card.id).toBe('string')
      expect(card.id.length).toBeGreaterThan(0)
      expect(card.name).toContain(card.emoji)
      expect(validRarities.has(card.rarity)).toBe(true)
      expect(validCategories.has(card.category)).toBe(true)
      expect(validActivations.has(card.activation)).toBe(true)
      expect(typeof card.isOffensive).toBe('boolean')
      expect(card.isOffensive).toBe(offensiveIds.has(card.id))
      expect(card.image).toBe(`./cards/${card.id}.jpg`)
      expect(card.shortDescription.length).toBeGreaterThan(5)
      expect(card.fullDescription.length).toBeGreaterThan(15)
      expect(typeof card.inDeck).toBe('boolean')

      // All card soundIds must exist in sounds.js
      const sound = findSound(card.soundId)
      expect(sound, `Sound not found for card ${card.id}: ${card.soundId}`).not.toBeNull()
    }
  })

  it('findCard returns matching card or null', () => {
    expect(findCard('bouclier')?.name).toBe('🛡️ Le Bouclier')
    expect(findCard('unknown-card')).toBeNull()
  })

  describe('pickRarity', () => {
    it('picks rarity according to weights', () => {
      expect(pickRarity(() => 0)).toBe('common')
      expect(pickRarity(() => 0.59)).toBe('common')
      expect(pickRarity(() => 0.6)).toBe('rare')
      expect(pickRarity(() => 0.89)).toBe('rare')
      expect(pickRarity(() => 0.9)).toBe('legendary')
      expect(pickRarity(() => 0.999)).toBe('legendary')
    })

    it('works with default rng', () => {
      const rarity = pickRarity()
      expect(['common', 'rare', 'legendary']).toContain(rarity)
    })

    it('supports custom weights', () => {
      const weights = { common: 0.8, rare: 0.15, legendary: 0.05 }
      expect(pickRarity(() => 0.79, weights)).toBe('common')
      expect(pickRarity(() => 0.81, weights)).toBe('rare')
      expect(pickRarity(() => 0.96, weights)).toBe('legendary')
    })
  })

  describe('drawCardByRarity', () => {
    it('draws a card matching requested rarity', () => {
      const card = drawCardByRarity('rare', () => 0)
      expect(card).not.toBeNull()
      expect(card?.rarity).toBe('rare')
      expect(card?.inDeck).toBe(true)
    })

    it('respects excludeIds', () => {
      const allRares = CARDS.filter((c) => c.inDeck && c.rarity === 'rare')
      const excluded = [allRares[0].id]
      const card = drawCardByRarity('rare', () => 0, excluded)
      expect(card?.id).not.toBe(excluded[0])
    })

    it('falls back to all cards of that rarity if all are excluded', () => {
      const allRares = CARDS.filter((c) => c.inDeck && c.rarity === 'rare')
      const excluded = allRares.map((c) => c.id)
      const card = drawCardByRarity('rare', () => 0, excluded)
      expect(card).not.toBeNull()
      expect(card?.rarity).toBe('rare')
    })

    it('returns null if rarity does not exist in deck', () => {
      expect(drawCardByRarity('nonexistent-rarity', () => 0)).toBeNull()
    })

    it('works with default parameters', () => {
      const card = drawCardByRarity('common')
      expect(card?.rarity).toBe('common')
    })

    it('restricts drawing to allowedIds when specified', () => {
      const allowed = ['arrondi', 'convertisseur']
      const card = drawCardByRarity('common', () => 0, [], allowed)
      expect(card).not.toBeNull()
      expect(allowed).toContain(card?.id)
    })

    it('falls back to allowedIds ignoring excludeIds if all allowed are excluded', () => {
      const allowed = ['arrondi', 'convertisseur']
      const card = drawCardByRarity('common', () => 0, allowed, allowed)
      expect(card).not.toBeNull()
      expect(allowed).toContain(card?.id)
    })

    it('returns null if allowedIds has no cards of that rarity', () => {
      const allowed = ['bouclier'] // rare only
      expect(drawCardByRarity('common', () => 0, [], allowed)).toBeNull()
      expect(drawCardByRarity('rare', () => 0, [], [])).toBeNull()
    })
  })

  describe('drawRandomCard', () => {
    it('draws random cards using weighted rarity', () => {
      const commonCard = drawRandomCard(() => 0.1)
      expect(commonCard?.rarity).toBe('common')

      const rareCard = drawRandomCard(() => 0.7)
      expect(rareCard?.rarity).toBe('rare')

      const legendaryCard = drawRandomCard(() => 0.95)
      expect(legendaryCard?.rarity).toBe('legendary')
    })

    it('works with default parameters', () => {
      const card = drawRandomCard()
      expect(card).not.toBeNull()
      expect(card?.inDeck).toBe(true)
    })

    it('respects weights and allowedIds options', () => {
      const allowed = ['arrondi', 'bouclier']
      // 0.1 -> common, with allowedIds
      const card = drawRandomCard(() => 0.1, [], {
        weights: { common: 0.5, rare: 0.5, legendary: 0 },
        allowedIds: allowed,
      })
      expect(card?.id).toBe('arrondi')
    })

    it('falls back to any available card in allowedIds if rarity is missing', () => {
      const allowed = ['arrondi'] // only common
      // 0.9 -> legendary, but no legendary in allowedIds
      const card = drawRandomCard(() => 0.9, [], { allowedIds: allowed })
      expect(card?.id).toBe('arrondi')

      // Also verify fallback when all allowedIds are excluded
      const cardExcluded = drawRandomCard(() => 0.9, ['arrondi'], { allowedIds: allowed })
      expect(cardExcluded?.id).toBe('arrondi')
    })

    it('returns null if allowedIds is empty', () => {
      expect(drawRandomCard(() => 0.5, [], { allowedIds: [] })).toBeNull()
    })
  })

  describe('drawDistinctCards', () => {
    it('draws distinct cards', () => {
      const cards = drawDistinctCards(3)
      expect(cards).toHaveLength(3)
      const ids = new Set(cards.map((c) => c.id))
      expect(ids.size).toBe(3)
    })

    it('does not exceed deck length', () => {
      const deckCount = CARDS.filter((c) => c.inDeck).length
      const cards = drawDistinctCards(100, () => 0)
      expect(cards).toHaveLength(deckCount)
      const ids = new Set(cards.map((c) => c.id))
      expect(ids.size).toBe(deckCount)
    })

    it('handles duplicate roll fallback gracefully', () => {
      // Always returns 0.95 -> legendary. Since there are 9 legendaries, asking for 12 will exhaust legendaries
      // and trigger the fallback to remaining deck cards
      const rng = () => 0.95
      const cards = drawDistinctCards(12, rng)
      expect(cards).toHaveLength(12)
      const ids = new Set(cards.map((c) => c.id))
      expect(ids.size).toBe(12)
    })

    it('respects allowedIds and caps count to allowed deck size', () => {
      const allowed = ['arrondi', 'bouclier']
      const cards = drawDistinctCards(5, () => 0, { allowedIds: allowed })
      expect(cards).toHaveLength(2)
      expect(cards.map((c) => c.id).sort()).toEqual(['arrondi', 'bouclier'])
    })

    it('returns empty array when allowedIds is empty or count <= 0', () => {
      expect(drawDistinctCards(3, () => 0, { allowedIds: [] })).toEqual([])
      expect(drawDistinctCards(0)).toEqual([])
    })

    it('handles duplicate rolls within allowedIds', () => {
      const allowed = ['bouclier', 'doubleur']
      // Force roll to pick rare
      const rng = () => 0.7
      const cards = drawDistinctCards(2, rng, { allowedIds: allowed })
      expect(cards).toHaveLength(2)
      expect(new Set(cards.map((c) => c.id)).size).toBe(2)
    })
  })

  describe('getCardDescriptions', () => {
    it('returns empty descriptions for null or missing card', () => {
      expect(getCardDescriptions(null)).toEqual({
        shortDescription: '',
        fullDescription: '',
      })
      expect(getCardDescriptions(undefined)).toEqual({
        shortDescription: '',
        fullDescription: '',
      })
    })

    it('returns original descriptions for non-pickpocket cards', () => {
      const bouclier = findCard('bouclier')
      const descs = getCardDescriptions(bouclier, { pickpocketAmount: 500 })
      expect(descs.shortDescription).toBe(bouclier?.shortDescription)
      expect(descs.fullDescription).toBe(bouclier?.fullDescription)
    })

    it('returns original descriptions for pickpocket when pickpocketAmount is 1000 or missing', () => {
      const pickpocket = findCard('pickpocket')
      expect(getCardDescriptions(pickpocket)).toEqual({
        shortDescription: pickpocket?.shortDescription,
        fullDescription: pickpocket?.fullDescription,
      })
      expect(getCardDescriptions(pickpocket, {})).toEqual({
        shortDescription: pickpocket?.shortDescription,
        fullDescription: pickpocket?.fullDescription,
      })
      expect(getCardDescriptions(pickpocket, { pickpocketAmount: 1000 })).toEqual({
        shortDescription: pickpocket?.shortDescription,
        fullDescription: pickpocket?.fullDescription,
      })
    })

    it('replaces 1 000 with custom formatted pickpocketAmount for pickpocket card', () => {
      const pickpocket = findCard('pickpocket')
      const descs = getCardDescriptions(pickpocket, { pickpocketAmount: 500 })
      expect(descs.shortDescription).toBe('Pendant votre tour : vole 500 pts au leader actuel.')
      expect(descs.fullDescription).toBe(
        '⚡ À jouer pendant votre tour : vole 500 points au joueur actuellement en tête (si ce leader a au moins 500 points et que ce n’est pas vous). Les points sont transférés à votre score.'
      )
    })

    it('formats pickpocketAmount with thousands separator when needed', () => {
      const pickpocket = findCard('pickpocket')
      const descs = getCardDescriptions(pickpocket, { pickpocketAmount: 2000 })
      const expected = (2000).toLocaleString('fr-FR')
      expect(descs.shortDescription).toContain(expected)
      expect(descs.fullDescription).toContain(expected)
      expect(descs.fullDescription).not.toContain('1 000')
    })
  })
})
