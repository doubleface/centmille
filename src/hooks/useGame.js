import { useMemo, useState } from 'react'
import { Game } from '../game/Game.js'
import { clearCurrentGame, loadCurrentGame, saveCurrentGame } from '../storage/storage.js'

const restoreGameFromStorage = () => {
  const payload = loadCurrentGame()
  if (!payload) return null

  try {
    return Game.fromSnapshot(payload.snapshot)
  } catch {
    clearCurrentGame()
    return null
  }
}

export const useGame = () => {
  const [game, setGame] = useState(() => restoreGameFromStorage())
  const [revision, setRevision] = useState(0)

  const snapshot = useMemo(() => {
    if (!game) return null
    void revision
    return game.getSnapshot()
  }, [game, revision])

  const startGame = (playerNames, options = {}) => {
    const nextGame = new Game(playerNames, options)
    saveCurrentGame(nextGame.getSnapshot())
    setGame(nextGame)

    return nextGame.getSnapshot()
  }

  const recordTurn = (turnScore) => {
    if (!game) throw new Error('No active game')

    const actionEvents = game.recordTurn(turnScore)
    saveCurrentGame(game.getSnapshot())
    setRevision((value) => value + 1)

    return actionEvents
  }

  const recordBust = () => {
    if (!game) throw new Error('No active game')

    const actionEvents = game.recordBust()
    saveCurrentGame(game.getSnapshot())
    setRevision((value) => value + 1)

    return actionEvents
  }

  const undoLastEvent = () => {
    if (!game) throw new Error('No active game')

    const restoredSnapshot = game.undoLastEvent()
    if (!restoredSnapshot) return null

    saveCurrentGame(restoredSnapshot)
    setRevision((value) => value + 1)

    return restoredSnapshot
  }

  const resetGame = () => {
    clearCurrentGame()
    setGame(null)
    setRevision(0)
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
