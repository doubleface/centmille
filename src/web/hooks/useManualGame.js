import { useMemo, useState } from 'react'
import { ManualGame } from '../../game/ManualGame.js'
import { clearCurrentGame, loadCurrentGame, saveCurrentGame } from '../storage.js'

const restoreGameFromStorage = () => {
  const payload = loadCurrentGame()
  if (!payload) return null

  try {
    return ManualGame.fromSnapshot(payload.snapshot)
  } catch {
    clearCurrentGame()
    return null
  }
}

export const useManualGame = () => {
  const [game, setGame] = useState(() => restoreGameFromStorage())

  const snapshot = useMemo(() => {
    if (!game) return null
    return game.getSnapshot()
  }, [game])

  const startGame = (playerNames, options = {}) => {
    const nextGame = new ManualGame(playerNames, options)
    saveCurrentGame(nextGame.getSnapshot())
    setGame(nextGame)

    return nextGame.getSnapshot()
  }

  const recordTurn = (turnScore) => {
    if (!game) throw new Error('No active manual game')

    const actionEvents = game.recordTurn(turnScore)
    saveCurrentGame(game.getSnapshot())
    setGame(ManualGame.fromSnapshot(game.getSnapshot()))

    return actionEvents
  }

  const recordBust = () => {
    if (!game) throw new Error('No active manual game')

    const actionEvents = game.recordBust()
    saveCurrentGame(game.getSnapshot())
    setGame(ManualGame.fromSnapshot(game.getSnapshot()))

    return actionEvents
  }

  const undoLastEvent = () => {
    if (!game) throw new Error('No active manual game')

    const restoredSnapshot = game.undoLastEvent()
    if (!restoredSnapshot) return null

    saveCurrentGame(restoredSnapshot)
    setGame(ManualGame.fromSnapshot(restoredSnapshot))

    return restoredSnapshot
  }

  const resetGame = () => {
    clearCurrentGame()
    setGame(null)
  }

  return {
    game,
    snapshot,
    startGame,
    recordTurn,
    recordBust,
    undoLastEvent,
    resetGame,
  }
}
