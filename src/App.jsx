import React, { useEffect, useMemo, useState } from 'react'
import { GameScreen } from './components/GameScreen.jsx'
import { GrimoireModal } from './components/GrimoireModal.jsx'
import { RevealModal } from './components/RevealModal.jsx'
import { SetupScreen } from './components/SetupScreen.jsx'
import { WinnerBanner } from './components/WinnerBanner.jsx'
import { CARDS } from './game/cardsCatalog.js'
import { useGame } from './hooks/useGame.js'
import soundPlayer, { playSound } from './sound/soundPlayer.js'

export const preloadCardImages = () => {
  for (const card of CARDS) {
    if (card.image && typeof window !== 'undefined' && typeof window.Image === 'function') {
      const img = new window.Image()
      img.src = card.image
    }
  }
}

export const REVEALABLE_EVENT_TYPES = [
  'card-drawn',
  'card-played',
  'boomerang',
  'magic-number',
  'table-event',
  'achievement',
  'consolation',
  'bounty-claimed',
  'crown-changed',
  'red-zone',
  'bomb-exploded',
  'pandora-curse',
]

export const buildRevealQueue = (actionEvents) => {
  if (!Array.isArray(actionEvents)) return []
  return actionEvents.filter((event) => REVEALABLE_EVENT_TYPES.includes(event.type))
}

export const buildRowsByPlayer = (snapshot) => {
  if (!snapshot) return {}

  const rowsByPlayer = Object.fromEntries(snapshot.players.map((player) => [player.name, []]))

  for (const event of snapshot.events) {
    const rows = rowsByPlayer[event.player] ?? []

    if (event.type === 'score') {
      rows.push({
        label: String(event.cumulative),
        variant: 'normal',
        isDowngraded: false,
        bustCount: 0,
      })
    }

    if (event.type === 'bust') {
      if (rows.length === 0) {
        rows.push({ label: '—', variant: 'normal', isDowngraded: false, bustCount: 1 })
      } else {
        const lastRow = rows[rows.length - 1]
        rows[rows.length - 1] = { ...lastRow, bustCount: (lastRow.bustCount ?? 0) + 1 }
      }
    }

    if (event.type === 'downgrade') {
      if (rows.length > 0) {
        rows[rows.length - 1] = {
          ...rows[rows.length - 1],
          isDowngraded: true,
          bustCount: 0,
        }
      }
    }

    if (event.type === 'shield-used') {
      if (rows.length > 0) {
        rows[rows.length - 1] = {
          ...rows[rows.length - 1],
          isDowngraded: false,
        }
      }
    }

    if (event.type === 'parachute-used') {
      rows.push({
        label: String(event.score),
        variant: 'normal',
        isDowngraded: false,
        bustCount: 0,
      })
    }

    rowsByPlayer[event.player] = rows
  }

  if (Array.isArray(snapshot.players)) {
    for (const player of snapshot.players) {
      if (typeof player.score === 'number' && player.score > 0) {
        const rows = rowsByPlayer[player.name] ?? []
        const lastActive = rows.findLast((r) => !r.isDowngraded && r.label !== '—')

        if (!lastActive || Number(lastActive.label) !== player.score) {
          for (let i = 0; i < rows.length; i++) {
            if (!rows[i].isDowngraded && rows[i].label !== '—') {
              rows[i] = { ...rows[i], isDowngraded: true }
            }
          }
          rows.push({
            label: String(player.score),
            variant: 'normal',
            isDowngraded: false,
            bustCount: 0,
          })
          rowsByPlayer[player.name] = rows
        }
      }
    }
  }

  return rowsByPlayer
}

export const buildCollisionReviewQueue = (actionEvents) => {
  if (!Array.isArray(actionEvents)) return []

  return actionEvents
    .filter((event) => event.type === 'downgrade' && event.from !== event.to)
    .map((event) => ({ player: event.player, from: event.from, to: event.to }))
}

export const playDowngradeSound = () => {
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return

  const ctx = new AudioCtx()
  const notes = [
    { freqs: [146.83, 293.66], start: 0, duration: 0.16, endRatio: 1 },
    { freqs: [138.59, 277.18], start: 0.19, duration: 0.16, endRatio: 1 },
    { freqs: [65.41, 130.81, 196.0, 261.63], start: 0.38, duration: 0.9, endRatio: 0.92 },
  ]

  for (const { freqs, start, duration, endRatio } of notes) {
    const t0 = ctx.currentTime + start
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.22, t0)
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration)
    gain.connect(ctx.destination)

    for (const freq of freqs) {
      const osc = ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(freq, t0)
      osc.frequency.exponentialRampToValueAtTime(freq * endRatio, t0 + duration)
      osc.connect(gain)
      osc.start(t0)
      osc.stop(t0 + duration)
    }
  }
}

export const App = () => {
  const [errorMessage, setErrorMessage] = useState(null)
  const [collisionReviewQueue, setCollisionReviewQueue] = useState([])
  const [collisionReviewIndex, setCollisionReviewIndex] = useState(0)
  const [revealQueue, setRevealQueue] = useState([])
  const [isGrimoireOpen, setIsGrimoireOpen] = useState(false)
  const [isMuted, setIsMuted] = useState(() => soundPlayer.isMuted())

  useEffect(() => {
    preloadCardImages()
  }, [])

  const {
    snapshot,
    startGame,
    recordTurn,
    recordBust,
    undoLastEvent,
    resetGame,
    playCard,
    resolvePendingInteraction,
  } = useGame()

  const players = snapshot ? snapshot.players.map((player) => player.name) : []
  const hasGame = players.length >= 2

  const rowsByPlayer = useMemo(() => buildRowsByPlayer(snapshot), [snapshot])
  const currentPlayer = snapshot ? snapshot.players[snapshot.currentPlayerIndex] : null
  const winner = snapshot?.winnerIndex === null ? null : snapshot?.players[snapshot.winnerIndex]?.name

  const processActionEvents = (actionEvents, { queueCollisions = true } = {}) => {
    if (!Array.isArray(actionEvents)) return

    const collisionQueue = buildCollisionReviewQueue(actionEvents)
    if (collisionQueue.length > 0) {
      playDowngradeSound()
    }
    if (queueCollisions) {
      setCollisionReviewQueue(collisionQueue)
      setCollisionReviewIndex(0)
    }

    const revealEvents = buildRevealQueue(actionEvents)
    if (revealEvents.length > 0) {
      const firstEvent = revealEvents[0]
      if (firstEvent.soundId) {
        playSound(firstEvent.soundId, {
          withCardFlip:
            firstEvent.type === 'card-drawn' || firstEvent.type === 'card-played',
        })
      }
      setRevealQueue((queue) => [...queue, ...revealEvents])
    }
  }

  const handleStart = (playerNames, options) => {
    if (options !== undefined) {
      startGame(playerNames, options)
    } else {
      startGame(playerNames)
    }
    setErrorMessage(null)
  }

  const handleRecordTurn = (turnScore, turnOptions) => {
    try {
      const actionEvents =
        turnOptions !== undefined ? recordTurn(turnScore, turnOptions) : recordTurn(turnScore)
      processActionEvents(actionEvents)
      setErrorMessage(null)
    } catch (error) {
      setErrorMessage(error.message)
    }
  }

  const handleRecordBust = (bustOptions) => {
    try {
      if (collisionReviewQueue.length > 0) return
      const actionEvents =
        bustOptions !== undefined ? recordBust(bustOptions) : recordBust()
      processActionEvents(actionEvents, { queueCollisions: false })
      setErrorMessage(null)
    } catch (error) {
      setErrorMessage(error.message)
    }
  }

  const handlePlayCard = (cardId, payload) => {
    try {
      if (typeof playCard !== 'function') return
      const actionEvents = playCard(cardId, payload)
      processActionEvents(actionEvents)
      setErrorMessage(null)
    } catch (error) {
      setErrorMessage(error.message)
    }
  }

  const handleResolveInteraction = (choice) => {
    try {
      if (typeof resolvePendingInteraction !== 'function') return
      const actionEvents = resolvePendingInteraction(choice)
      processActionEvents(actionEvents)
      setErrorMessage(null)
    } catch (error) {
      setErrorMessage(error.message)
    }
  }

  const handleToggleMute = () => {
    const nextMuted = soundPlayer.toggleMuted()
    setIsMuted(nextMuted)
  }

  const handleUndo = () => {
    try {
      if (collisionReviewQueue.length > 0) return
      undoLastEvent()
      setErrorMessage(null)
    } catch (error) {
      setErrorMessage(error.message)
    }
  }

  const handleResetGame = () => {
    try {
      resetGame()
      setCollisionReviewQueue([])
      setCollisionReviewIndex(0)
      setRevealQueue([])
      setIsGrimoireOpen(false)
      setErrorMessage(null)
    } catch (error) {
      setErrorMessage(error.message)
    }
  }

  const activeCollisionReview =
    collisionReviewQueue.length > 0
      ? {
          activePlayer: collisionReviewQueue[collisionReviewIndex]?.player,
          from: collisionReviewQueue[collisionReviewIndex]?.from,
          to: collisionReviewQueue[collisionReviewIndex]?.to,
          isLast: collisionReviewIndex >= collisionReviewQueue.length - 1,
        }
      : null

  const handleNextCollision = () => {
    if (collisionReviewQueue.length === 0) return

    if (collisionReviewIndex >= collisionReviewQueue.length - 1) {
      setCollisionReviewQueue([])
      setCollisionReviewIndex(0)
      return
    }

    setCollisionReviewIndex((value) => value + 1)
    playDowngradeSound()
  }

  return (
    <main>
      {!hasGame ? (
        <SetupScreen onStart={handleStart} />
      ) : (
        <GameScreen
          players={players}
          rowsByPlayer={rowsByPlayer}
          currentPlayer={currentPlayer}
          onRecordTurn={handleRecordTurn}
          onRecordBust={handleRecordBust}
          onUndo={handleUndo}
          onResetGame={handleResetGame}
          errorMessage={errorMessage}
          collisionReview={activeCollisionReview}
          onNextCollision={handleNextCollision}
          mode={snapshot?.mode ?? 'quick-10k'}
          playerStates={snapshot?.players ?? []}
          currentPlayerIndex={snapshot?.currentPlayerIndex ?? 0}
          activeTableEvent={snapshot?.activeTableEvent ?? null}
          crownHolderIndex={snapshot?.crownHolderIndex ?? null}
          bombState={snapshot?.bombState ?? null}
          redZoneEnabled={Boolean(snapshot?.redZoneEnabled)}
          redZoneThreshold={snapshot?.redZoneThreshold ?? 90000}
          activeTurnModifiers={snapshot?.activeTurnModifiers ?? {}}
          lastTurnWasBust={Boolean(snapshot?.lastTurnWasBust)}
          lastPlayedCardId={snapshot?.lastPlayedCardId ?? null}
          onPlayCard={handlePlayCard}
          onOpenGrimoire={() => setIsGrimoireOpen(true)}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}
      <RevealModal
        revealEvent={revealQueue[0] ?? null}
        pendingInteraction={
          revealQueue.length === 0 ? (snapshot?.pendingInteraction ?? null) : null
        }
        players={snapshot?.players ?? []}
        onDismissReveal={() => setRevealQueue((q) => q.slice(1))}
        onResolveInteraction={handleResolveInteraction}
      />
      <GrimoireModal
        isOpen={isGrimoireOpen}
        discoveredIds={snapshot?.discoveredIds ?? []}
        onClose={() => setIsGrimoireOpen(false)}
      />
      <WinnerBanner winner={winner} />
    </main>
  )
}
