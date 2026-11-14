import React, { useEffect, useRef } from 'react'
import { diceStopReason, diceToRoll, diceTurnScore, newDiceTurn } from '../game/DiceTurn.js'

const PIP_POSITIONS = {
  1: [[20, 20]],
  2: [[10, 10], [30, 30]],
  3: [[10, 10], [20, 20], [30, 30]],
  4: [[10, 10], [30, 10], [10, 30], [30, 30]],
  5: [[10, 10], [30, 10], [20, 20], [10, 30], [30, 30]],
  6: [[10, 10], [30, 10], [10, 20], [30, 20], [10, 30], [30, 30]],
}

export const DiceTray = ({
  turn,
  carry,
  player,
  openingScore,
  targetScore,
  activeTurnModifiers = {},
  onRoll,
  onFinish,
  isLocked,
  errorMessage,
}) => {
  const effectiveScore = diceTurnScore(turn, activeTurnModifiers)
  const cardFailure = turn.phase === 'playing' && (
    activeTurnModifiers.contratTarget != null && turn.total !== activeTurnModifiers.contratTarget
      ? `Contrat : le cumul doit atteindre exactement ${activeTurnModifiers.contratTarget} points.`
      : activeTurnModifiers.toutOuRien && turn.total < 1000
        ? 'Tout ou Rien : il faut au moins 1000 points, sinon deux bâtons.'
        : null
  )
  const overshoots = player.score + effectiveScore > targetScore
  const actionRef = useRef(null)
  // Garder un point d’entrée clavier quand la relance cède la place à la confirmation.
  useEffect(() => {
    if (!isLocked) actionRef.current?.focus()
  }, [player.name, turn.phase, isLocked, overshoots])

  const offer = carry ? newDiceTurn(carry, turn.diceCount) : null
  const inherited = turn.inheritedTotal
  const remaining = diceToRoll(turn)
  const full = turn.dice.every((die) => die.kept)
  const bust = turn.phase === 'bust'
  const result = turn.lastResult
  const reason = diceStopReason(turn, player, openingScore, activeTurnModifiers)

  return (
    <section className="turn dice-tray" aria-label="Plateau de dés virtuels">
      <p className="turn__player">
        Tour de <strong>{player.name}</strong>
        {!player.hasOpened ? <span className="label-tag">ouverture {openingScore}</span> : null}
      </p>
      <p className="dice-tray__hint">Dés marquants gardés automatiquement.</p>
      <ol className="dice-tray__dice" aria-label="Résultats des dés">
        {turn.dice.map((die, index) => (
          <li key={index} className={`dice-tray__die${die.kept ? ' dice-tray__die--kept' : ''}`}>
            <svg
              className="dice-tray__face"
              viewBox="0 0 40 40"
              width="44"
              height="44"
              role="img"
              aria-label={`Dé ${index + 1} : ${die.face ?? 'non lancé'}, ${die.kept ? 'gardé, bloqué jusqu’à main pleine' : 'libre'}`}
            >
              {(PIP_POSITIONS[die.face] ?? []).map(([x, y]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r="3.5" fill="currentColor" />
              ))}
              {die.face === null ? <text x="20" y="25" textAnchor="middle">—</text> : null}
            </svg>
            <small>{die.kept ? 'Gardé' : 'Libre'}</small>
          </li>
        ))}
      </ol>
      <div role="status" aria-live="polite" aria-atomic="true">
        <div className="dice-tray__totals">
          <span>Gain du lancer <strong>{result?.points ?? 0}</strong></span>
          <span>Cumul du tour <strong>{turn.total}</strong>{inherited ? <small>dont {inherited} repris</small> : null}</span>
        </div>
        {effectiveScore !== turn.total && !cardFailure ? <p>Score après cartes : <strong>{effectiveScore}</strong> pts</p> : null}
        {cardFailure && !overshoots ? <p>Arrêter maintenant entraîne l’échec. {cardFailure}</p> : null}
        {result ? (
          <p className="dice-tray__hint">
            {bust
              ? `Broucouille ! ${turn.lost} points perdus. Confirmez pour passer au joueur suivant.`
              : result.groups.map((group) => `${group.label} : ${group.points}`).join(' · ')}
          </p>
        ) : null}
        {full && !bust && !overshoots ? <p>Main pleine : relancez les {turn.diceCount} dés, cumul conservé.</p> : null}
        {overshoots ? <p>Cible de {targetScore} dépassée : relance impossible. Confirmez l’échec pour passer au joueur suivant.</p> : null}
        {!bust && !overshoots && reason ? <p id="dice-stop-reason" className="dice-tray__hint">{reason}</p> : null}
      </div>
      {errorMessage ? <p className="turn__error" role="alert">{errorMessage}</p> : null}
      {isLocked ? <p className="dice-tray__hint">Terminez les confirmations avant de continuer.</p> : null}
      {offer ? (
        <button type="button" className="btn btn--ghost" onClick={() => onRoll({ takeOver: true })} disabled={isLocked}>
          Reprendre {offer.total} pts · lancer {diceToRoll(offer)} dé{diceToRoll(offer) > 1 ? 's' : ''}
        </button>
      ) : null}
      <div className="btn-row">
        {!bust && !overshoots ? (
          <>
            <button ref={actionRef} type="button" className="btn btn--primary" onClick={() => onRoll()} disabled={isLocked}>
              {turn.phase === 'ready' ? `Lancer ${remaining > 1 ? 'les' : 'le'} ${remaining} dé${remaining > 1 ? 's' : ''}` : `Continuer · ${remaining} dé${remaining > 1 ? 's' : ''}`}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onFinish}
              disabled={isLocked || Boolean(reason)}
              aria-describedby={reason ? 'dice-stop-reason' : undefined}
            >
              {cardFailure ? 'Confirmer l’échec (carte)' : 'Arrêter et marquer'}
            </button>
          </>
        ) : (
          <button ref={actionRef} type="button" className="btn btn--danger" onClick={onFinish} disabled={isLocked}>
            {overshoots ? 'Confirmer l’échec (dépassement)' : 'Confirmer la broucouille'}
          </button>
        )}
      </div>
    </section>
  )
}
