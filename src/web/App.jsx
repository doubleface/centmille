import { useMemo, useState } from 'react'
import { GameScreen } from './components/GameScreen.jsx'
import { SetupScreen } from './components/SetupScreen.jsx'
import { WinnerBanner } from './components/WinnerBanner.jsx'
import { useManualGame } from './hooks/useManualGame.js'

const buildRowsByPlayer = (snapshot) => {
  if (!snapshot) return {}

  const rowsByPlayer = Object.fromEntries(snapshot.players.map((player) => [player.name, []]))

  for (const event of snapshot.events) {
    const rows = rowsByPlayer[event.player] ?? []

    if (event.type === 'score') {
      rows.push({ label: String(event.cumulative), variant: 'normal', isDowngraded: false })
    }

    if (event.type === 'bust') {
      rows.push({ label: ' ', variant: 'bust', isDowngraded: false })
    }

    if (event.type === 'downgrade' && rows.length > 0) {
      rows[rows.length - 1] = { ...rows[rows.length - 1], isDowngraded: true }
    }

    rowsByPlayer[event.player] = rows
  }

  return rowsByPlayer
}

export const App = () => {
  const [errorMessage, setErrorMessage] = useState(null)
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
      recordTurn(turnScore)
      setErrorMessage(null)
    } catch (error) {
      setErrorMessage(error.message)
    }
  }

  const handleRecordBust = () => {
    try {
      recordBust()
      setErrorMessage(null)
    } catch (error) {
      setErrorMessage(error.message)
    }
  }

  const handleUndo = () => {
    try {
      undoLastEvent()
      setErrorMessage(null)
    } catch (error) {
      setErrorMessage(error.message)
    }
  }

  const handleResetGame = () => {
    try {
      resetGame()
      setErrorMessage(null)
    } catch (error) {
      setErrorMessage(error.message)
    }
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
        />
      )}
      <WinnerBanner winner={winner} />
    </main>
  )
}
