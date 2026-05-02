import { useMemo, useState } from 'react'

export const ScoreInput = ({ currentPlayer, onValidate, onBust, errorMessage }) => {
  const [rawTurnScore, setRawTurnScore] = useState('')

  const turnScore = useMemo(() => Number.parseInt(rawTurnScore, 10), [rawTurnScore])
  const isScoreInteger = Number.isInteger(turnScore)
  const isPositiveStep = isScoreInteger && turnScore >= 50 && turnScore % 50 === 0
  const needsOpening = Boolean(currentPlayer && !currentPlayer.hasOpened)
  const isOpeningBlocked = needsOpening && turnScore < 500
  const canValidate = isPositiveStep && !isOpeningBlocked

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
          id="turn-score"
          name="turnScore"
          className="turn__score-input"
          inputMode="numeric"
          placeholder="0"
          value={rawTurnScore}
          onChange={(event) => setRawTurnScore(event.target.value)}
        />
      </div>

      {errorMessage ? <p className="turn__error">{errorMessage}</p> : null}

      <div className="btn-row">
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleValidate}
          disabled={!canValidate}
        >
          Valider
        </button>
        <button type="button" className="btn btn--danger" onClick={onBust}>
          Échec
        </button>
      </div>
    </section>
  )
}
