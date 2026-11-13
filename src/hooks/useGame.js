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

  const recordTurn = (turnScore, turnOptions = {}) => {
    if (!game) throw new Error('No active game')

    const actionEvents = game.recordTurn(turnScore, turnOptions)
    saveCurrentGame(game.getSnapshot())
    setRevision((value) => value + 1)

    return actionEvents
  }

  const recordBust = (bustOptions = {}) => {
    if (!game) throw new Error('No active game')

    const actionEvents = game.recordBust(bustOptions)
    saveCurrentGame(game.getSnapshot())
    setRevision((value) => value + 1)

    return actionEvents
  }

  const playCard = (cardId, payload = {}) => {
    if (!game) throw new Error('No active game')

    const actionEvents = game.playCard(cardId, payload)
    saveCurrentGame(game.getSnapshot())
    setRevision((value) => value + 1)

    return actionEvents
  }

  const resolvePendingInteraction = (choice = {}) => {
    if (!game) throw new Error('No active game')

    const actionEvents = game.resolvePendingInteraction(choice)
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

  const setDiceMode = (mode) => {
    if (!game) throw new Error('No active game')
    game.setDiceMode(mode)
    saveCurrentGame(game.getSnapshot())
    setRevision((value) => value + 1)
  }

  const rollDice = (options) => {
    if (!game) throw new Error('No active game')
    game.rollDice(options)
    saveCurrentGame(game.getSnapshot())
    setRevision((value) => value + 1)
  }

  const finishDiceTurn = () => {
    if (!game) throw new Error('No active game')
    const actionEvents = game.finishDiceTurn()
    saveCurrentGame(game.getSnapshot())
    setRevision((value) => value + 1)
    return actionEvents
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
    playCard,
    resolvePendingInteraction,
    setDiceMode,
    rollDice,
    finishDiceTurn,
  }
}
