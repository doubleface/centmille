import { GameState } from './GameState.js'

export class GameEngine {
  constructor(gameState) {
    this.gameState = gameState
  }

  static create(playerNames, options = {}) {
    return new GameEngine(new GameState(playerNames, options))
  }

  getState() {
    return this.gameState
  }

  dispatch(action) {
    if (!action || typeof action !== 'object') {
      throw new Error('Action must be an object')
    }

    switch (action.type) {
      case 'start_turn':
        return this.gameState.startTurn()
      case 'roll':
        return this.gameState.playRoll(action.rolledDice, action.keptDice)
      case 'stop_turn':
        return this.gameState.stopTurn()
      case 'force_failure':
        return this.gameState.endTurnWithFailure(action.reason ?? 'bust')
      case 'snapshot':
        return this.gameState.getSnapshot()
      default:
        throw new Error(`Unknown action type: ${action.type}`)
    }
  }
}
