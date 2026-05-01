import { GameEngine, GameState } from '../index.js'
import { readSaveFile, writeSaveFile } from './saveFile.js'

export class CliSession {
  engine = null
  history = []

  hasActiveGame() {
    return this.engine !== null
  }

  newGame(players) {
    this.engine = GameEngine.create(players)
    return { players }
  }

  async load(file) {
    const { filePath, payload } = await readSaveFile(file)
    const gameState = GameState.fromSnapshot(payload.snapshot)
    this.engine = new GameEngine(gameState)
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

  dispatch(action) {
    return this.engine.dispatch(action)
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
