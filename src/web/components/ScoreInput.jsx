import React, { useMemo, useState } from 'react'

export const ScoreInput = ({
  currentPlayer,
  onValidate,
  onBust,
  errorMessage,
  isLocked = false,
  lockMessage = null,
}) => {
  const [rawTurnScore, setRawTurnScore] = useState('')

  const turnScore = useMemo(() => Number.parseInt(rawTurnScore, 10), [rawTurnScore])
  const isScoreInteger = Number.isInteger(turnScore)
  const isPositiveStep = isScoreInteger && turnScore >= 50 && turnScore % 50 === 0
  const needsOpening = Boolean(currentPlayer && !currentPlayer.hasOpened)
  const isOpeningBlocked = needsOpening && turnScore < 500
  const canValidate = isPositiveStep && !isOpeningBlocked && !isLocked

  const handleValidate = () => {
    if (!canValidate) return
    onValidate(turnScore)
    setRawTurnScore('')
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
        <button type="button" className="btn btn--danger" onClick={onBust} disabled={isLocked}>
          Échec
        </button>
      </div>
    </section>
  )
}
