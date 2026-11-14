import React from 'react'
import { isBonusMode } from '../game/GameMode.js'
import { CornerMenu } from './CornerMenu.jsx'
import { DiceTray } from './DiceTray.jsx'
import { PlayerColumn } from './PlayerColumn.jsx'
import { PlayerHand } from './PlayerHand.jsx'
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
  mode = 'quick-10k',
  playerStates = [],
  currentPlayerIndex = 0,
  activeTableEvent = null,
  crownHolderIndex = null,
  bombState = null,
  redZoneEnabled = false,
  redZoneThreshold = 90000,
  activeTurnModifiers = {},
  lastTurnWasBust = false,
  lastPlayedCardId = null,
  onPlayCard = null,
  onOpenGrimoire = null,
  isMuted = false,
  onToggleMute = null,
  diceMode = 'physical',
  diceTurn = null,
  diceCarry = null,
  openingScore = 500,
  targetScore = 10000,
  onSetDiceMode = null,
  onRollDice = null,
  onFinishDiceTurn = null,
  diceLocked = false,
  canUndoDiceCard = false,
}) => {
  return (
    <section className="sheet-screen">
      <h1 className="sheet-screen__title">Partie en cours</h1>

      {isBonusMode(mode) && activeTableEvent ? (
        <div className="table-event-banner" data-testid="table-event-banner">
          {activeTableEvent.name} — {activeTableEvent.description} ({activeTableEvent.remainingTurns} tour(s) restants)
        </div>
      ) : null}

      <div className="scoreboard">
        {players.map((player, idx) => {
          const isCurrentPlayer = currentPlayer?.name === player
          const isCollisionTarget = collisionReview?.activePlayer === player
          const pState = playerStates[idx]
          const badges = []

          if (isBonusMode(mode)) {
            if (crownHolderIndex === idx) {
              badges.push({ id: 'crown', icon: '👑', title: 'Porteur de la Couronne' })
            }
            if (bombState?.holderIndex === idx) {
              badges.push({
                id: 'bomb',
                icon: `💣${bombState.remainingTableRounds}`,
                title: 'Porteur de la Bombe',
              })
            }
            if (pState?.status?.frozen) {
              badges.push({ id: 'frozen', icon: '🧊', title: 'Gelé' })
            }
            if (pState?.status?.ghost) {
              badges.push({ id: 'ghost', icon: '👻', title: 'Fantôme' })
            }
            if (pState?.status?.cursed) {
              badges.push({ id: 'cursed', icon: '🧿', title: 'Maudit' })
            }
            if (pState?.status?.vampire) {
              badges.push({ id: 'vampire', icon: '🧛', title: 'Vampire' })
            }
            if (redZoneEnabled && (pState?.score ?? 0) >= redZoneThreshold) {
              badges.push({ id: 'red-zone', icon: '🚨', title: 'Zone rouge' })
            }
            if ((pState?.hand?.length ?? 0) > 0) {
              badges.push({
                id: 'hand',
                icon: `🃏×${pState.hand.length}`,
                title: 'Cartes en main',
              })
            }
          }

          return (
            <PlayerColumn
              key={player}
              name={player}
              rows={rowsByPlayer[player] ?? []}
              badges={badges}
              isCurrentPlayer={isCurrentPlayer}
              isCollisionTarget={isCollisionTarget}
              shouldAutoScroll={collisionReview ? isCollisionTarget : isCurrentPlayer}
            />
          )
        })}
      </div>

      {onSetDiceMode ? (
        <fieldset className="dice-mode" disabled={diceLocked || Boolean(collisionReview) || Boolean(diceTurn && diceTurn.phase !== 'ready')}>
          <legend>Dés de la partie</legend>
          <label>
            <input type="radio" name="dice-mode" value="physical" checked={diceMode === 'physical'} onChange={() => onSetDiceMode('physical')} />
            Physiques
          </label>
          <label>
            <input type="radio" name="dice-mode" value="virtual" checked={diceMode === 'virtual'} onChange={() => onSetDiceMode('virtual')} />
            Virtuels
          </label>
          {diceCarry ? <p>Passer aux dés physiques abandonne la reprise proposée.</p> : null}
          {diceTurn && diceTurn.phase !== 'ready' ? <p>Choix des dés bloqué pendant le tour. Annulation possible uniquement pour la dernière carte, avant toute relance.</p> : null}
        </fieldset>
      ) : null}

      {diceMode === 'virtual' && diceTurn ? (
        <DiceTray
          turn={diceTurn}
          carry={diceCarry}
          player={currentPlayer}
          openingScore={openingScore}
          targetScore={targetScore}
          activeTurnModifiers={activeTurnModifiers}
          onRoll={onRollDice}
          onFinish={onFinishDiceTurn}
          isLocked={diceLocked || Boolean(collisionReview)}
          errorMessage={errorMessage}
        />
      ) : (
      <ScoreInput
        currentPlayer={currentPlayer}
        onValidate={onRecordTurn}
        onBust={onRecordBust}
        errorMessage={errorMessage}
        isLocked={Boolean(collisionReview)}
        lockMessage={collisionReview ? 'Validez les rétrogradations avant de continuer' : null}
        allowNonMultipleOf100={Boolean(activeTurnModifiers?.arrondi)}
        assuranceActive={Boolean(activeTurnModifiers?.assurance)}
        bombHolder={bombState?.holderIndex === currentPlayerIndex}
        players={playerStates}
        currentPlayerIndex={currentPlayerIndex}
      />
      )}

      {isBonusMode(mode) ? (
        <PlayerHand
          player={currentPlayer}
          players={playerStates}
          currentPlayerIndex={currentPlayerIndex}
          lastTurnWasBust={lastTurnWasBust}
          lastPlayedCardId={lastPlayedCardId}
          redZoneThreshold={redZoneThreshold}
          redZoneEnabled={redZoneEnabled}
          activeTurnModifiers={activeTurnModifiers}
          onPlayCard={onPlayCard}
          disabled={Boolean(collisionReview) || (diceMode === 'virtual' && diceLocked)}
          diceTurn={diceMode === 'virtual' ? diceTurn : null}
          mode={mode}
        />
      ) : null}

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

      <CornerMenu
        canUndo={!collisionReview && (!diceTurn || diceTurn.phase === 'ready' || canUndoDiceCard)}
        onUndo={onUndo}
        onResetGame={onResetGame}
        hasGrimoire={isBonusMode(mode)}
        onOpenGrimoire={onOpenGrimoire}
        isMuted={isMuted}
        onToggleMute={onToggleMute}
      />
    </section>
  )
}
