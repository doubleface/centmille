import React, { useMemo, useState } from 'react'
import { GameScreen } from './components/GameScreen.jsx'
import { SetupScreen } from './components/SetupScreen.jsx'
import { WinnerBanner } from './components/WinnerBanner.jsx'
import { useManualGame } from './hooks/useManualGame.js'

export const buildRowsByPlayer = (snapshot) => {
  if (!snapshot) return {}

  const rowsByPlayer = Object.fromEntries(snapshot.players.map((player) => [player.name, []]))

  for (const event of snapshot.events) {
    const rows = rowsByPlayer[event.player] ?? []

    if (event.type === 'score') {
      rows.push({ label: String(event.cumulative), variant: 'normal', isDowngraded: false, bustCount: 0 })
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

    rowsByPlayer[event.player] = rows
  }

  return rowsByPlayer
}

export const buildCollisionReviewQueue = (actionEvents) => {
  if (!Array.isArray(actionEvents)) return []

  return actionEvents
    .filter((event) => event.type === 'downgrade' && event.from !== event.to)
    .map((event) => ({ player: event.player, from: event.from, to: event.to }))
}

export const App = () => {
  const [errorMessage, setErrorMessage] = useState(null)
  const [collisionReviewQueue, setCollisionReviewQueue] = useState([])
  const [collisionReviewIndex, setCollisionReviewIndex] = useState(0)
  const { snapshot, startGame, recordTurn, recordBust, undoLastEvent, resetGame } = useManualGame()

  const players = snapshot ? snapshot.players.map((player) => player.name) : []
  const hasGame = players.length >= 2

  const rowsByPlayer = useMemo(() => buildRowsByPlayer(snapshot), [snapshot])
  const currentPlayer = snapshot ? snapshot.players[snapshot.currentPlayerIndex] : null
  const winner = snapshot?.winnerIndex === null ? null : snapshot?.players[snapshot.winnerIndex]?.name

  const handleStart = (playerNames) => {
    try {
      startGame(playerNames)
      setErrorMessage(null)
    } catch (error) {
      setErrorMessage(error.message)
    }
  }

  const handleRecordTurn = (turnScore) => {
    try {
      const actionEvents = recordTurn(turnScore)
      const queue = buildCollisionReviewQueue(actionEvents)
      setCollisionReviewQueue(queue)
      setCollisionReviewIndex(0)
      setErrorMessage(null)
    } catch (error) {
      setErrorMessage(error.message)
    }
  }

  const handleRecordBust = () => {
    try {
      if (collisionReviewQueue.length > 0) return
      recordBust()
      setErrorMessage(null)
    } catch (error) {
      setErrorMessage(error.message)
    }
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
        />
      )}
      <WinnerBanner winner={winner} />
    </main>
  )
}
