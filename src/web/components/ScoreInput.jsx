import { useMemo, useState } from 'react'

export const ScoreInput = ({
  currentPlayer,
  onValidate,
  onBust,
  onUndo,
  onResetGame,
  errorMessage,
}) => {
  const [rawTurnScore, setRawTurnScore] = useState('')

  const turnScore = useMemo(() => Number.parseInt(rawTurnScore, 10), [rawTurnScore])
  const isScoreInteger = Number.isInteger(turnScore)
  const isPositiveStep = isScoreInteger && turnScore >= 50 && turnScore % 50 === 0
  const isOpeningBlocked = Boolean(currentPlayer && !currentPlayer.hasOpened && turnScore < 500)
  const canValidate = isPositiveStep && !isOpeningBlocked

  const handleValidate = () => {
    if (!canValidate) return
    onValidate(turnScore)
    setRawTurnScore('')
  }

  return (
    <section>
      <label htmlFor="turn-score">Score du tour</label>
      <input
        id="turn-score"
        name="turnScore"
        inputMode="numeric"
        value={rawTurnScore}
        onChange={(event) => setRawTurnScore(event.target.value)}
      />
      {isOpeningBlocked ? <p>Ouverture requise: minimum 500 points.</p> : null}
      {errorMessage ? <p>{errorMessage}</p> : null}
      <div>
        <button type="button" onClick={handleValidate} disabled={!canValidate}>
          Valider
        </button>
        <button type="button" onClick={onBust}>
          Bust
        </button>
        <button type="button" onClick={onUndo}>
          Annuler
        </button>
        <button type="button" onClick={onResetGame}>
          Recommencer
        </button>
      </div>
    </section>
  )
}
