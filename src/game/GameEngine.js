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
        return this.gameState.startTurn({ steal: action.steal })
      case 'roll':
        return this.gameState.playRoll(action.rolledDice, action.keptDice)
      case 'record_roll':
        return this.gameState.recordRoll(action.rolledDice)
      case 'keep':
        return this.gameState.applyKeep(action.keptDice)
      case 'stop_turn':
        return this.gameState.stopTurn()
      case 'force_failure':
        return this.gameState.endTurnWithFailure(action.reason ?? 'bust')
      case 'snapshot':
        return this.gameState.getSnapshot()
      case 'turn_start_state':
        return this.gameState.getTurnStartState()
      default:
        throw new Error(`Unknown action type: ${action.type}`)
    }
  }
}
