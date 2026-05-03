import React from 'react'
import { CornerMenu } from './CornerMenu.jsx'
import { PlayerColumn } from './PlayerColumn.jsx'
import { ScoreInput } from './ScoreInput.jsx'

export const GameScreen = ({
  players,
  rowsByPlayer = {},
  currentPlayer,
  onRecordTurn,
  onRecordBust,
  onUndo,
  onResetGame,
  errorMessage,
  collisionReview = null,
  onNextCollision = null,
}) => {
  return (
    <section className="sheet-screen">
      <h1 className="sheet-screen__title">Partie en cours</h1>

      <div className="scoreboard">
        {players.map((player) => {
          const isCurrentPlayer = currentPlayer?.name === player
          const isCollisionTarget = collisionReview?.activePlayer === player

          return (
            <PlayerColumn
              key={player}
              name={player}
              rows={rowsByPlayer[player] ?? []}
              isCurrentPlayer={isCurrentPlayer}
              isCollisionTarget={isCollisionTarget}
              shouldAutoScroll={collisionReview ? isCollisionTarget : isCurrentPlayer}
            />
          )
        })}
      </div>

      <ScoreInput
        currentPlayer={currentPlayer}
        onValidate={onRecordTurn}
        onBust={onRecordBust}
        errorMessage={errorMessage}
        isLocked={Boolean(collisionReview)}
        lockMessage={collisionReview ? 'Validez les rétrogradations avant de continuer' : null}
      />

      {collisionReview ? (
        <section className="collision-review" aria-live="polite">
          <p className="collision-review__title">
            Rétrogradation: <strong>{collisionReview.activePlayer}</strong> ({collisionReview.from} →{' '}
            {collisionReview.to})
          </p>
          <button type="button" className="btn btn--primary" onClick={onNextCollision}>
            {collisionReview.isLast ? 'Terminer' : 'Suivant'}
          </button>
        </section>
      ) : null}

      <CornerMenu onUndo={onUndo} onResetGame={onResetGame} />
    </section>
  )
}
