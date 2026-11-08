import React, { useState } from 'react'
import { ACHIEVEMENTS } from '../game/achievements.js'
import { CARDS, getCardDescriptions } from '../game/cardsCatalog.js'
import { resolveGameMode } from '../game/GameMode.js'
import { getMagicNumbersForMode } from '../game/magicNumbers.js'
import { TABLE_EVENTS } from '../game/tableEvents.js'

function CardThumbnail({ image, alt, emoji }) {
  const [hasError, setHasError] = useState(false)

  if (!image || hasError) {
    return (
      <span className="grimoire-item__emoji" data-testid="card-emoji-fallback">
        {emoji}
      </span>
    )
  }

  return (
    <img
      src={image}
      alt={alt}
      className="grimoire-item__img"
      onError={() => setHasError(true)}
    />
  )
}

export function GrimoireModal({
  isOpen = false,
  discoveredIds = [],
  onClose,
  mode = 'cent-mille',
  modeConfig = null,
}) {
  if (!isOpen) return null

  const config = modeConfig ?? resolveGameMode({ mode })
  const hasTiers = (config.tiers ?? []).length > 0

  const filteredCards = CARDS.filter((card) => {
    if (!config.deckCardIds) return true
    return config.deckCardIds.includes(card.id) || (card.id === 'architecte' && hasTiers)
  })

  const filteredMagic = getMagicNumbersForMode(mode)

  const filteredEvents = config.allowedTableEventIds
    ? TABLE_EVENTS.filter((event) => config.allowedTableEventIds.includes(event.id))
    : TABLE_EVENTS

  const filteredAchievements = config.allowedAchievementIds
    ? ACHIEVEMENTS.filter((ach) => config.allowedAchievementIds.includes(ach.id))
    : ACHIEVEMENTS

  const discoveredSet = new Set(discoveredIds)

  const discoveredCardsCount = filteredCards.filter((card) =>
    discoveredSet.has(`card:${card.id}`)
  ).length

  const discoveredMagicCount = filteredMagic.filter((magic) =>
    discoveredSet.has(`magic:${magic.id}`)
  ).length

  const discoveredEventsCount = filteredEvents.filter((event) =>
    discoveredSet.has(`event:${event.id}`)
  ).length

  const discoveredAchievementsCount = filteredAchievements.filter((ach) =>
    discoveredSet.has(`achievement:${ach.id}`)
  ).length

  return (
    <div className="modal-overlay" data-testid="grimoire-modal">
      <div className="grimoire-modal">
        <div className="grimoire-modal__header">
          <h2 className="grimoire-modal__title">📖 Le Grimoire</h2>
          <button
            type="button"
            className="grimoire-modal__close"
            data-testid="grimoire-close"
            onClick={onClose}
            aria-label="Fermer le grimoire"
          >
            ✕
          </button>
        </div>

        <div className="grimoire-modal__body">
          {/* Section 1: Cartes */}
          <section
            className="grimoire-section"
            data-testid="grimoire-section-cards"
          >
            <h3 className="grimoire-section__title">
              🃏 Cartes ({discoveredCardsCount}/{filteredCards.length})
            </h3>
            <div className="grimoire-grid">
              {filteredCards.map((card) => {
                const isDiscovered = discoveredSet.has(`card:${card.id}`)

                if (!isDiscovered) {
                  return (
                    <div
                      key={card.id}
                      className="grimoire-item grimoire-item--locked"
                      data-testid={`grimoire-card-${card.id}`}
                    >
                      <div className="grimoire-item__thumbnail">
                        <span className="grimoire-item__unknown">❓</span>
                      </div>
                      <div className="grimoire-item__body">
                        <div className="grimoire-item__name">❓ ???</div>
                        <div className="grimoire-item__desc">
                          Découvrez cet élément en cours de partie
                        </div>
                      </div>
                    </div>
                  )
                }

                const descs = getCardDescriptions(card, config)

                return (
                  <div
                    key={card.id}
                    className={`grimoire-item card-tile--${card.rarity}`}
                    data-testid={`grimoire-card-${card.id}`}
                  >
                    <div className="grimoire-item__thumbnail">
                      <CardThumbnail
                        image={card.image}
                        alt={card.name}
                        emoji={card.emoji}
                      />
                    </div>
                    <div className="grimoire-item__body">
                      <div className="grimoire-item__name">{card.name}</div>
                      <div className="grimoire-item__desc">
                        {descs.fullDescription || descs.shortDescription}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Section 2: Nombres magiques */}
          <section
            className="grimoire-section"
            data-testid="grimoire-section-magic"
          >
            <h3 className="grimoire-section__title">
              🔮 Nombres magiques ({discoveredMagicCount}/{filteredMagic.length})
            </h3>
            <div className="grimoire-grid">
              {filteredMagic.map((magic) => {
                const isDiscovered = discoveredSet.has(`magic:${magic.id}`)

                if (!isDiscovered) {
                  return (
                    <div
                      key={magic.id}
                      className="grimoire-item grimoire-item--locked"
                      data-testid={`grimoire-magic-${magic.id}`}
                    >
                      <div className="grimoire-item__thumbnail">
                        <span className="grimoire-item__unknown">❓</span>
                      </div>
                      <div className="grimoire-item__body">
                        <div className="grimoire-item__name">❓ ???</div>
                        <div className="grimoire-item__desc">
                          Découvrez cet élément en cours de partie
                        </div>
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={magic.id}
                    className="grimoire-item"
                    data-testid={`grimoire-magic-${magic.id}`}
                  >
                    <div className="grimoire-item__thumbnail">
                      <span className="grimoire-item__emoji">{magic.emoji}</span>
                    </div>
                    <div className="grimoire-item__body">
                      <div className="grimoire-item__name">{magic.name}</div>
                      <div className="grimoire-item__desc">
                        {magic.description}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Section 3: Événements de table */}
          <section
            className="grimoire-section"
            data-testid="grimoire-section-events"
          >
            <h3 className="grimoire-section__title">
              🌍 Événements de table ({discoveredEventsCount}/
              {filteredEvents.length})
            </h3>
            <div className="grimoire-grid">
              {filteredEvents.map((event) => {
                const isDiscovered = discoveredSet.has(`event:${event.id}`)

                if (!isDiscovered) {
                  return (
                    <div
                      key={event.id}
                      className="grimoire-item grimoire-item--locked"
                      data-testid={`grimoire-event-${event.id}`}
                    >
                      <div className="grimoire-item__thumbnail">
                        <span className="grimoire-item__unknown">❓</span>
                      </div>
                      <div className="grimoire-item__body">
                        <div className="grimoire-item__name">❓ ???</div>
                        <div className="grimoire-item__desc">
                          Découvrez cet élément en cours de partie
                        </div>
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={event.id}
                    className="grimoire-item"
                    data-testid={`grimoire-event-${event.id}`}
                  >
                    <div className="grimoire-item__thumbnail">
                      <span className="grimoire-item__emoji">{event.emoji}</span>
                    </div>
                    <div className="grimoire-item__body">
                      <div className="grimoire-item__name">{event.name}</div>
                      <div className="grimoire-item__desc">
                        {event.description}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Section 4: Succès */}
          <section
            className="grimoire-section"
            data-testid="grimoire-section-achievements"
          >
            <h3 className="grimoire-section__title">
              🏆 Succès ({discoveredAchievementsCount}/{filteredAchievements.length})
            </h3>
            <div className="grimoire-grid">
              {filteredAchievements.map((ach) => {
                const isDiscovered = discoveredSet.has(`achievement:${ach.id}`)

                if (!isDiscovered) {
                  return (
                    <div
                      key={ach.id}
                      className="grimoire-item grimoire-item--locked"
                      data-testid={`grimoire-achievement-${ach.id}`}
                    >
                      <div className="grimoire-item__thumbnail">
                        <span className="grimoire-item__unknown">❓</span>
                      </div>
                      <div className="grimoire-item__body">
                        <div className="grimoire-item__name">❓ ???</div>
                        <div className="grimoire-item__desc">
                          Découvrez cet élément en cours de partie
                        </div>
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={ach.id}
                    className="grimoire-item"
                    data-testid={`grimoire-achievement-${ach.id}`}
                  >
                    <div className="grimoire-item__thumbnail">
                      <span className="grimoire-item__emoji">{ach.emoji}</span>
                    </div>
                    <div className="grimoire-item__body">
                      <div className="grimoire-item__name">{ach.name}</div>
                      <div className="grimoire-item__desc">
                        {ach.description}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
