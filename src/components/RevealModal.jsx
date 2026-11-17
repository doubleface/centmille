import React, { useState } from 'react'
import { findAchievement } from '../game/achievements.js'
import { findCard, getCardDescriptions } from '../game/cardsCatalog.js'
import { resolveGameMode } from '../game/GameMode.js'
import { MAGIC_NUMBERS } from '../game/magicNumbers.js'
import { findTableEvent } from '../game/tableEvents.js'

function CardThumbnail({ image, alt, emoji }) {
  const [hasError, setHasError] = useState(false)

  if (!image || hasError) {
    return (
      <span className="reveal-card__emoji" data-testid="card-emoji-fallback">
        {emoji}
      </span>
    )
  }

  return (
    <img
      src={image}
      alt={alt}
      className="reveal-card__img"
      onError={() => setHasError(true)}
    />
  )
}

function resolveRevealContent(event, modeConfig = null) {
  if (!event) return null
  const { type } = event

  switch (type) {
    case 'card-drawn': {
      const card = findCard(event.cardId)
      const descs = getCardDescriptions(card, modeConfig)
      return {
        title: `${event.player} pioche ${card?.name ?? event.cardId}`,
        subtitle: card?.name ?? event.cardId,
        emoji: card?.emoji ?? '🃏',
        image: card?.image ?? null,
        description:
          descs.fullDescription || descs.shortDescription || 'Nouvelle carte piochée !',
      }
    }
    case 'card-played': {
      const card = findCard(event.cardId)
      const descs = getCardDescriptions(card, modeConfig)
      return {
        title: `${event.player} joue ${card?.name ?? event.cardId}`,
        subtitle: card?.name ?? event.cardId,
        emoji: card?.emoji ?? '🃏',
        image: card?.image ?? null,
        description:
          descs.fullDescription || descs.shortDescription || 'Carte jouée !',
      }
    }
    case 'boomerang': {
      const card = findCard('boomerang')
      const targetCard = findCard(event.cardId)
      const descs = getCardDescriptions(card, modeConfig)
      return {
        title: '🪃 Boomerang !',
        subtitle: `${event.player} renvoie l'effet à ${event.attacker} !`,
        emoji: card?.emoji ?? '🪃',
        image: card?.image ?? './cards/boomerang.jpg',
        description: targetCard
          ? `L'effet de « ${targetCard.name} » est renvoyé directement sur son lanceur ${event.attacker} !`
          : (descs.fullDescription || 'Effet renvoyé !'),
      }
    }
    case 'magic-number': {
      const magic = MAGIC_NUMBERS.find((m) => m.id === event.magicId)
      return {
        title: `🔮 ${event.name ?? magic?.name ?? 'Nombre magique'}`,
        subtitle: magic?.name ?? 'Nombre magique',
        emoji: magic?.emoji ?? '🔮',
        image: null,
        description: `${event.player} a atteint un nombre magique : ${
          magic?.description ?? ''
        }`,
      }
    }
    case 'table-event': {
      const tableEvent = findTableEvent(event.eventId)
      return {
        title: `🌍 ${event.name ?? tableEvent?.name ?? 'Événement de table'}`,
        subtitle: tableEvent?.name ?? 'Événement de table',
        emoji: tableEvent?.emoji ?? '🌍',
        image: null,
        description:
          event.description ?? tableEvent?.description ?? 'Un événement modifie le tour !',
      }
    }
    case 'achievement': {
      const ach = findAchievement(event.achievementId)
      return {
        title: `🏆 Succès : ${event.name ?? ach?.name ?? 'Succès débloqué'}`,
        subtitle: ach?.name ?? 'Succès',
        emoji: ach?.emoji ?? '🏆',
        image: null,
        description: `${event.player} débloque le succès : ${
          ach?.description ?? ''
        }`,
      }
    }
    case 'consolation': {
      const card = findCard(event.cardId)
      const descs = getCardDescriptions(card, modeConfig)
      return {
        title: `🩹 Consolation pour ${event.player}`,
        subtitle: card?.name ?? 'Carte de consolation',
        emoji: card?.emoji ?? '🩹',
        image: card?.image ?? null,
        description: `Après cette chute difficile, ${event.player} reçoit une carte de consolation : ${
          card?.name ?? ''
        }. ${descs.fullDescription || ''}`,
      }
    }
    case 'bounty-claimed': {
      return {
        title: '👑 Prime de la Couronne !',
        subtitle: `${event.hunter} empoche la prime !`,
        emoji: '👑',
        image: null,
        description: `${event.hunter} a fait chuter le porteur de la couronne (${event.leader}) et empoche la Prime de la Couronne !`,
      }
    }
    case 'crown-changed': {
      return {
        title: `👑 Nouveau Roi : ${event.player} !`,
        subtitle: `${event.player} prend la tête !`,
        emoji: '👑',
        image: null,
        description: `${event.player} prend la tête de la partie et porte la Couronne ! Une prime est désormais mise sur sa tête.`,
      }
    }
    case 'red-zone': {
      const threshold = event.threshold ?? modeConfig?.redZoneThreshold ?? 90000
      const formattedThreshold = Number(threshold).toLocaleString('fr-FR')
      const sabotageSentence =
        event.sabotage !== false
          ? ' Les cartes offensives lui sont interdites, et les adversaires préparent leur sabotage !'
          : ' Les cartes offensives lui sont interdites !'
      return {
        title: '🚨 Zone Rouge !',
        subtitle: `${event.player} dépasse ${formattedThreshold} pts !`,
        emoji: '🚨',
        image: null,
        description: `Attention ! ${event.player} a franchi les ${formattedThreshold} points et entre dans la Zone Rouge !${sabotageSentence}`,
      }
    }
    case 'bomb-exploded': {
      const bombCard = findCard('bombe')
      return {
        title: '💣 BOOM ! La Bombe a explosé !',
        subtitle: `${event.player} subit la déflagration !`,
        emoji: bombCard?.emoji ?? '💣',
        image: bombCard?.image ?? './cards/bombe.jpg',
        description: `La bombe a explosé sur ${event.player} qui chute de ${event.from} à ${event.to} points !`,
      }
    }
    case 'pandora-curse': {
      const pandoraCard = findCard('pandore')
      return {
        title: '📦 Malédiction de Pandore !',
        subtitle: `${event.player} est maudit !`,
        emoji: '🧿',
        image: pandoraCard?.image ?? './cards/pandore.jpg',
        description: `Pas de chance ! La Boîte de Pandore s'est retournée contre ${event.player} qui reçoit le statut Malédiction pour son prochain tour !`,
      }
    }
    default: {
      return {
        title: event.name ?? event.type ?? 'Événement',
        subtitle: event.player ?? '',
        emoji: '✨',
        image: null,
        description: event.description ?? '',
      }
    }
  }
}

export function RevealModal({
  revealEvent = null,
  pendingInteraction = null,
  players = [],
  onDismissReveal,
  onResolveInteraction,
  mode = 'cent-mille',
  modeConfig = null,
}) {
  if (!revealEvent && !pendingInteraction) {
    return null
  }

  const config = modeConfig ?? resolveGameMode({ mode })

  // Priority 1: revealEvent
  if (revealEvent) {
    const content = resolveRevealContent(revealEvent, config)
    return (
      <div className="modal-overlay" data-testid="reveal-modal">
        <div className="reveal-card">
          {revealEvent.firstDiscovery && (
            <div
              className="reveal-modal__badge"
              data-testid="reveal-discovery-badge"
            >
              ✨ NOUVELLE DÉCOUVERTE !
            </div>
          )}

          <h2 className="reveal-card__title" data-testid="reveal-title">
            {content.title}
          </h2>

          <div className="reveal-card__media">
            {content.image ? (
              <CardThumbnail
                image={content.image}
                alt={content.subtitle}
                emoji={content.emoji}
              />
            ) : (
              <span className="reveal-card__emoji" data-testid="reveal-emoji">
                {content.emoji}
              </span>
            )}
          </div>

          <p
            className="reveal-card__description"
            data-testid="reveal-description"
          >
            {content.description}
          </p>

          <button
            type="button"
            className="reveal-modal__dismiss"
            data-testid="reveal-dismiss"
            onClick={onDismissReveal}
          >
            Compris !
          </button>
        </div>
      </div>
    )
  }

  // Priority 2: pendingInteraction
  switch (pendingInteraction.type) {
    case 'architect': {
      const architectName =
        players[pendingInteraction.architectPlayerIndex]?.name ?? 'Architecte'
      const recipientName =
        players[pendingInteraction.recipientPlayerIndex]?.name ?? 'Dernier'

      return (
        <div className="modal-overlay" data-testid="reveal-modal">
          <div className="reveal-card reveal-card--architect">
            <h2 className="reveal-card__title">🏗️ Privilège de l'Architecte</h2>

            <div className="reveal-card__media">
              <CardThumbnail
                image="./cards/architecte.jpg"
                alt="Architecte"
                emoji="🏗️"
              />
            </div>

            <p className="reveal-card__description">
              {architectName} (Architecte) choisit 1 des 3 cartes à offrir à{' '}
              {recipientName} (Dernier) :
            </p>

            <div className="reveal-card__choices">
              {pendingInteraction.choices.map((cardId) => {
                const card = findCard(cardId)
                if (!card) return null
                const descs = getCardDescriptions(card, config)
                return (
                  <button
                    type="button"
                    key={cardId}
                    className={`card-tile card-tile--${card.rarity}`}
                    data-testid={`choice-${cardId}`}
                    onClick={() => onResolveInteraction?.({ cardId })}
                  >
                    <div className="card-tile__thumbnail">
                      <CardThumbnail
                        image={card.image}
                        alt={card.name}
                        emoji={card.emoji}
                      />
                    </div>
                    <div className="card-tile__body">
                      <div className="card-tile__name">{card.name}</div>
                      <div className="card-tile__desc">
                        {descs.shortDescription}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )
    }

    case 'answer-42': {
      return (
        <div className="modal-overlay" data-testid="reveal-modal">
          <div className="reveal-card">
            <h2 className="reveal-card__title">🌌 La Grande Réponse (42 000)</h2>
            <p className="reveal-card__description">
              🌌 La Grande Réponse (42 000) : choisissez 1 carte à garder parmi ces 2
            </p>

            <div className="reveal-card__choices">
              {pendingInteraction.choices.map((cardId) => {
                const card = findCard(cardId)
                if (!card) return null
                const descs = getCardDescriptions(card, config)
                return (
                  <button
                    type="button"
                    key={cardId}
                    className={`card-tile card-tile--${card.rarity}`}
                    data-testid={`choice-${cardId}`}
                    onClick={() => onResolveInteraction?.({ cardId })}
                  >
                    <div className="card-tile__thumbnail">
                      <CardThumbnail
                        image={card.image}
                        alt={card.name}
                        emoji={card.emoji}
                      />
                    </div>
                    <div className="card-tile__body">
                      <div className="card-tile__name">{card.name}</div>
                      <div className="card-tile__desc">
                        {descs.shortDescription}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )
    }

    case 'hand-overflow': {
      const handLimit = config?.handLimit ?? 3
      return (
        <div className="modal-overlay" data-testid="reveal-modal">
          <div className="reveal-card">
            <h2 className="reveal-card__title">✋ Main pleine</h2>
            <p className="reveal-card__description">
              Main pleine (max {handLimit} cartes) : choisissez quelle carte défausser
            </p>

            <div className="reveal-card__choices">
              {pendingInteraction.choices.map((cardId) => {
                const card = findCard(cardId)
                if (!card) return null
                const descs = getCardDescriptions(card, config)
                return (
                  <button
                    type="button"
                    key={cardId}
                    className={`card-tile card-tile--${card.rarity}`}
                    data-testid={`discard-${cardId}`}
                    onClick={() =>
                      onResolveInteraction?.({ discardedCardId: cardId })
                    }
                  >
                    <div className="card-tile__thumbnail">
                      <CardThumbnail
                        image={card.image}
                        alt={card.name}
                        emoji={card.emoji}
                      />
                    </div>
                    <div className="card-tile__body">
                      <div className="card-tile__name">{card.name}</div>
                      <div className="card-tile__desc">
                        {descs.shortDescription}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )
    }

    case 'defensive-reaction': {
      const victimName =
        players[pendingInteraction.victimIndex]?.name ?? 'Le joueur'

      return (
        <div className="modal-overlay" data-testid="reveal-modal">
          <div className="reveal-card">
            <h2 className="reveal-card__title">🛡️ Réaction défensive</h2>
            <p className="reveal-card__description">
              {victimName} chute de {pendingInteraction.from} à{' '}
              {pendingInteraction.to} points.
            </p>

            <div className="reveal-card__actions">
              {pendingInteraction.availableCards.map((cardId) => {
                const card = findCard(cardId)
                return (
                  <button
                    type="button"
                    key={cardId}
                    className="reveal-modal__btn-reaction"
                    data-testid={`defensive-card-${cardId}`}
                    onClick={() => onResolveInteraction?.({ cardId })}
                  >
                    Utiliser {card?.name ?? cardId}
                  </button>
                )
              })}
              <button
                type="button"
                className="reveal-modal__btn-skip"
                data-testid="defensive-skip"
                onClick={() => onResolveInteraction?.({ skip: true })}
              >
                Garder mes cartes
              </button>
            </div>
          </div>
        </div>
      )
    }

    case 'shop': {
      const buyer = players[pendingInteraction.playerIndex]
      const buyerName = buyer?.name ?? 'Joueur'
      const buyerScore = buyer?.score ?? 0

      return (
        <div className="modal-overlay" data-testid="reveal-modal">
          <div className="reveal-card">
            <h2 className="reveal-card__title">
              🛒 Boutique du palier {pendingInteraction.tier}
            </h2>
            <p className="reveal-card__description">
              🛒 Boutique du palier {pendingInteraction.tier} pour {buyerName}{' '}
              (score: {buyerScore})
            </p>

            <div className="reveal-card__shop-actions">
              <button
                type="button"
                className="reveal-modal__shop-btn"
                data-testid="shop-buy-common"
                disabled={buyerScore < 1000}
                onClick={() => onResolveInteraction?.({ rarity: 'common' })}
              >
                Acheter Commune (1 000 pts)
              </button>

              <button
                type="button"
                className="reveal-modal__shop-btn"
                data-testid="shop-buy-rare"
                disabled={buyerScore < 2000}
                onClick={() => onResolveInteraction?.({ rarity: 'rare' })}
              >
                Acheter Rare (2 000 pts)
              </button>

              <button
                type="button"
                className="reveal-modal__shop-btn"
                data-testid="shop-buy-legendary"
                disabled={buyerScore < 4000}
                onClick={() => onResolveInteraction?.({ rarity: 'legendary' })}
              >
                Acheter Légendaire (4 000 pts)
              </button>

              <button
                type="button"
                className="reveal-modal__btn-skip"
                data-testid="shop-skip"
                onClick={() => onResolveInteraction?.({ skip: true })}
              >
                Passer la boutique
              </button>
            </div>
          </div>
        </div>
      )
    }

    default:
      return null
  }
}
