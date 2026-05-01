import { GameEngine, GameState } from '../index.js'
import { readSaveFile, writeSaveFile } from './saveFile.js'

export class CliSession {
  engine = null
  pendingRollDice = null
  history = []

  hasActiveGame() {
    return this.engine !== null
  }

  newGame(players) {
    this.engine = GameEngine.create(players)
    this.pendingRollDice = null
    return { players }
  }

  async load(file) {
    const { filePath, payload } = await readSaveFile(file)
    const gameState = GameState.fromSnapshot(payload.snapshot)
    this.engine = new GameEngine(gameState)
    this.pendingRollDice = null
    return { filePath }
  }

  async save(file) {
    const snapshot = this.getSnapshot()
    const { filePath } = await writeSaveFile(file, snapshot)
    return { filePath }
  }

  getSnapshot() {
    return this.engine.dispatch({ type: 'snapshot' })
  }

  ensureTurnStarted() {
    if (!this.engine.getState().getActiveTurn()) {
      this.engine.dispatch({ type: 'start_turn' })
    }
  }

  stageRoll(dice) {
    this.ensureTurnStarted()
    this.pendingRollDice = dice
    return { dice, staged: true }
  }

  keep(keptDice) {
    const result = this.engine.dispatch({
      type: 'roll',
      rolledDice: this.pendingRollDice,
      keptDice,
    })
    this.pendingRollDice = null
    return result
  }

  stop() {
    const result = this.engine.dispatch({ type: 'stop_turn' })
    this.pendingRollDice = null
    return result
  }

  fail(reason) {
    const result = this.engine.dispatch({ type: 'force_failure', reason })
    this.pendingRollDice = null
    return result
  }

  addHistory(entry) {
    this.history.push(entry)
    if (this.history.length > 200) {
      this.history = this.history.slice(-200)
    }
  }

  getRecentHistory(limit = 8) {
    return this.history.slice(-limit)
  }
}
