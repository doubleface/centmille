import React, { useMemo, useState } from 'react'

export const ScoreInput = ({
  currentPlayer,
  onValidate,
  onBust,
  errorMessage,
  isLocked = false,
  lockMessage = null,
  allowNonMultipleOf100 = false,
  assuranceActive = false,
  bombHolder = false,
  players = [],
  currentPlayerIndex = 0,
}) => {
  const [rawTurnScore, setRawTurnScore] = useState('')
  const [selectedBombTarget, setSelectedBombTarget] = useState(null)

  const turnScore = useMemo(() => Number.parseInt(rawTurnScore, 10), [rawTurnScore])
  const isScoreInteger = Number.isInteger(turnScore)
  const isPositiveStep = isScoreInteger && turnScore >= 50 && turnScore % 50 === 0
  const isStepValid = allowNonMultipleOf100
    ? isPositiveStep
    : isPositiveStep && turnScore % 100 === 0

  const needsOpening = Boolean(currentPlayer && !currentPlayer.hasOpened)
  const isOpeningBlocked = needsOpening && turnScore < 500
  const canValidate = isStepValid && !isOpeningBlocked && !isLocked

  const targetCandidates = players
    .map((player, index) => ({
      index,
      name: typeof player === 'string' ? player : (player?.name ?? `Joueur ${index + 1}`),
    }))
    .filter((entry) => entry.index !== currentPlayerIndex)

  const effectiveBombTargetIndex =
    selectedBombTarget !== null && targetCandidates.some((c) => c.index === selectedBombTarget)
      ? selectedBombTarget
      : (targetCandidates[0]?.index ?? null)

  const shouldShowBombPicker =
    bombHolder && isScoreInteger && turnScore >= 1000 && players.length > 1

  const handleValidate = () => {
    if (!canValidate) return
    if (shouldShowBombPicker && effectiveBombTargetIndex !== null) {
      onValidate(turnScore, { bombTargetIndex: effectiveBombTargetIndex })
    } else {
      onValidate(turnScore)
    }
    setRawTurnScore('')
  }

  const handleBust = () => {
    if (assuranceActive && isPositiveStep) {
      onBust({ accumulatedPoints: turnScore })
      setRawTurnScore('')
    } else {
      onBust()
    }
  }

  return (
    <section className="turn">
      <p className="turn__player">
        Tour de <strong>{currentPlayer?.name ?? '—'}</strong>
        {needsOpening ? <span className="label-tag">ouverture 500</span> : null}
      </p>

      <div className="turn__score">
        <label className="turn__score-label" htmlFor="turn-score">
          Score du tour
        </label>
        <input
          disabled={isLocked}
          id="turn-score"
          name="turnScore"
          type="tel"
          className="turn__score-input"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="0"
          value={rawTurnScore}
          onChange={(event) => setRawTurnScore(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            handleValidate()
          }}
        />
      </div>

      {shouldShowBombPicker ? (
        <div className="turn__bomb-target">
          <label htmlFor="bomb-target-select" className="turn__score-label">
            Transmettre la bombe à :
          </label>
          <select
            id="bomb-target-select"
            data-testid="bomb-target-select"
            value={effectiveBombTargetIndex ?? ''}
            onChange={(event) => setSelectedBombTarget(Number(event.target.value))}
          >
            {targetCandidates.map((candidate) => (
              <option key={candidate.index} value={candidate.index}>
                {candidate.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {errorMessage ? <p className="turn__error">{errorMessage}</p> : null}
      {isLocked && lockMessage ? <p className="turn__error">{lockMessage}</p> : null}

      <div className="btn-row">
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleValidate}
          disabled={!canValidate}
        >
          Valider
        </button>
        <button
          type="button"
          className="btn btn--danger"
          onClick={handleBust}
          disabled={isLocked}
        >
          Échec
        </button>
      </div>
    </section>
  )
}
