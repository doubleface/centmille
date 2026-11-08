import React, { useState } from 'react'
import { findCard } from '../game/cardsCatalog.js'

function CardThumbnail({ image, alt, emoji }) {
  const [hasError, setHasError] = useState(false)

  if (!image || hasError) {
    return (
      <span className="card-tile__emoji" data-testid="card-emoji-fallback">
        {emoji}
      </span>
    )
  }

  return (
    <img
      src={image}
      alt={alt}
      className="card-tile__img"
      onError={() => setHasError(true)}
    />
  )
}

export function PlayerHand({
  player,
  players = [],
  currentPlayerIndex = 0,
  lastTurnWasBust = false,
  lastPlayedCardId = null,
  redZoneThreshold = 90000,
  redZoneEnabled = true,
  activeTurnModifiers = {},
  onPlayCard,
  disabled = false,
}) {
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [targetIndex, setTargetIndex] = useState(null)
  const [refuseGage, setRefuseGage] = useState(false)
  const [contratScore, setContratScore] = useState('500')

  const hand = player?.hand ?? []

  const targetCandidates = players
    .map((p, idx) => ({ player: p, index: idx }))
    .filter((entry) => entry.index !== currentPlayerIndex)

  const effectiveTargetIndex =
    targetIndex !== null && targetCandidates.some((c) => c.index === targetIndex)
      ? targetIndex
      : (targetCandidates[0]?.index ?? null)

  const activeModifiersList = []
  if (activeTurnModifiers.arrondi) {
    activeModifiersList.push({ id: 'arrondi', label: "🔼 L'Arrondi" })
  }
  if (activeTurnModifiers.doubleur) {
    activeModifiersList.push({ id: 'doubleur', label: '✖️2 Doubleur' })
  }
  if (activeTurnModifiers.sniper) {
    activeModifiersList.push({ id: 'sniper', label: '🎯 Sniper' })
  }
  if (activeTurnModifiers.assurance) {
    activeModifiersList.push({ id: 'assurance', label: '☂️ Assurance' })
  }
  if (activeTurnModifiers.toutOuRien) {
    activeModifiersList.push({ id: 'toutOuRien', label: '💥 Tout ou Rien' })
  }
  if (
    activeTurnModifiers.contratTarget !== null &&
    activeTurnModifiers.contratTarget !== undefined
  ) {
    activeModifiersList.push({
      id: 'contrat',
      label: `📜 Contrat (${activeTurnModifiers.contratTarget} pts)`,
    })
  }
  if (Array.isArray(activeTurnModifiers.declarativeCards)) {
    for (const cardId of activeTurnModifiers.declarativeCards) {
      const card = findCard(cardId)
      activeModifiersList.push({
        id: `decl-${cardId}`,
        label: card?.name ?? cardId,
      })
    }
  }

  const selectedCardId = selectedIndex !== null ? hand[selectedIndex] : null
  const selectedCard = selectedCardId ? findCard(selectedCardId) : null

  const handleCardClick = (index) => {
    if (selectedIndex === index) {
      setSelectedIndex(null)
    } else {
      setSelectedIndex(index)
      setRefuseGage(false)
      setContratScore('500')
    }
  }

  const isPlayDisabled = () => {
    if (!selectedCard) return true
    if (disabled) return true
    if (
      redZoneEnabled &&
      (player?.score ?? 0) >= redZoneThreshold &&
      selectedCard.isOffensive
    ) {
      return true
    }
    if (selectedCard.id === 'aspirateur' && !lastTurnWasBust) {
      return true
    }
    if (selectedCard.id === 'echo' && !lastPlayedCardId) {
      return true
    }
    if (
      selectedCard.activation === 'instant-target' &&
      effectiveTargetIndex === null
    ) {
      return true
    }
    if (selectedCard.id === 'contrat') {
      const parsed = Number(contratScore)
      if (!Number.isInteger(parsed) || parsed < 300 || parsed % 100 !== 0) {
        return true
      }
    }
    return false
  }

  const handlePlay = () => {
    if (!selectedCard || isPlayDisabled()) return

    if (selectedCard.activation === 'instant-target') {
      onPlayCard?.(selectedCard.id, {
        targetIndex: effectiveTargetIndex,
        refuseGage,
      })
    } else if (selectedCard.id === 'contrat') {
      onPlayCard?.('contrat', {
        targetScore: Number(contratScore),
      })
    } else {
      onPlayCard?.(selectedCard.id, {})
    }

    setSelectedIndex(null)
  }

  return (
    <div className="player-hand" data-testid="player-hand">
      {activeModifiersList.length > 0 && (
        <div
          className="player-hand__modifiers"
          data-testid="active-turn-modifiers"
        >
          <span className="player-hand__modifiers-title">Effets actifs ce tour :</span>
          <div className="player-hand__modifiers-list">
            {activeModifiersList.map((mod) => (
              <span
                key={mod.id}
                className="player-hand__modifier-badge"
                data-testid={`modifier-${mod.id}`}
              >
                {mod.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="player-hand__cards">
        {hand.length === 0 ? (
          <div className="player-hand__empty" data-testid="player-hand-empty">
            Aucune carte en main
          </div>
        ) : (
          hand.map((cardId, index) => {
            const card = findCard(cardId)
            if (!card) return null
            const isSelected = selectedIndex === index

            return (
              <button
                type="button"
                key={`${cardId}-${index}`}
                data-testid={`hand-card-${cardId}-${index}`}
                className={`card-tile card-tile--${card.rarity} ${
                  isSelected ? 'card-tile--selected' : ''
                }`}
                onClick={() => handleCardClick(index)}
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
                  <div className="card-tile__desc">{card.shortDescription}</div>
                </div>
              </button>
            )
          })
        )}
      </div>

      {selectedCard && (
        <div
          className="card-action-panel"
          data-testid="card-action-panel"
        >
          <div className="card-action-panel__header">
            <span className="card-action-panel__title">
              {selectedCard.name}
            </span>
            <button
              type="button"
              className="card-action-panel__close"
              data-testid="card-action-close"
              onClick={() => setSelectedIndex(null)}
              aria-label="Fermer le panneau"
            >
              ✕
            </button>
          </div>

          <p className="card-action-panel__description">
            {selectedCard.fullDescription}
          </p>

          {selectedCard.activation === 'passive-prompt' && (
            <div
              className="card-action-panel__note"
              data-testid="passive-prompt-note"
            >
              S'active automatiquement en réaction
            </div>
          )}

          {selectedCard.activation === 'instant-target' && (
            <div className="card-action-panel__controls">
              <label
                htmlFor="target-player-select"
                className="card-action-panel__label"
              >
                Choisir une cible :
              </label>
              <select
                id="target-player-select"
                data-testid="target-player-select"
                className="card-action-panel__select"
                value={effectiveTargetIndex ?? ''}
                onChange={(e) => setTargetIndex(Number(e.target.value))}
              >
                {targetCandidates.map((entry) => (
                  <option key={entry.index} value={entry.index}>
                    {entry.player.name}
                  </option>
                ))}
              </select>

              {selectedCard.id === 'main-faible' && (
                <label className="card-action-panel__checkbox-label">
                  <input
                    type="checkbox"
                    data-testid="refuse-gage-checkbox"
                    checked={refuseGage}
                    onChange={(e) => setRefuseGage(e.target.checked)}
                  />
                  La cible refuse le gage (-500 pts)
                </label>
              )}

              <button
                type="button"
                className="card-action-panel__btn-use"
                data-testid="play-card-button"
                disabled={isPlayDisabled()}
                onClick={handlePlay}
              >
                Utiliser
              </button>
            </div>
          )}

          {selectedCard.id === 'contrat' && (
            <div className="card-action-panel__controls">
              <label
                htmlFor="contrat-target-score"
                className="card-action-panel__label"
              >
                Objectif de points (min 300, pas de 100) :
              </label>
              <input
                id="contrat-target-score"
                type="number"
                min="300"
                step="100"
                data-testid="contrat-target-input"
                className="card-action-panel__input"
                value={contratScore}
                onChange={(e) => setContratScore(e.target.value)}
              />
              <button
                type="button"
                className="card-action-panel__btn-use"
                data-testid="play-card-button"
                disabled={isPlayDisabled()}
                onClick={handlePlay}
              >
                Utiliser
              </button>
            </div>
          )}

          {selectedCard.activation !== 'passive-prompt' &&
            selectedCard.activation !== 'instant-target' &&
            selectedCard.id !== 'contrat' && (
              <div className="card-action-panel__controls">
                <button
                  type="button"
                  className="card-action-panel__btn-use"
                  data-testid="play-card-button"
                  disabled={isPlayDisabled()}
                  onClick={handlePlay}
                >
                  Utiliser
                </button>
              </div>
            )}
        </div>
      )}
    </div>
  )
}
