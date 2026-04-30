import { TurnRules } from '../rules/TurnRules.js'
import { PlayerState } from './PlayerState.js'

export class GameState {
  constructor(playerNames, options = {}) {
    if (!Array.isArray(playerNames) || playerNames.length < 2) {
      throw new Error('GameState requires at least 2 players')
    }

    this.targetScore = options.targetScore ?? 10000
    this.diceCount = options.diceCount ?? 5
    this.openingScore = options.openingScore ?? 500

    this.players = playerNames.map((name) => new PlayerState(name))
    this.currentPlayerIndex = 0
    this.turnRules = new TurnRules()
    this.lastValidatedTurn = null
    this.winner = null
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex]
  }

  getTurnStartState() {
    if (!this.lastValidatedTurn) {
      return { canSteal: false, carriedScore: 0, diceToRoll: this.diceCount }
    }

    return {
      canSteal: true,
      carriedScore: this.lastValidatedTurn.score,
      diceToRoll:
        this.lastValidatedTurn.diceRemaining === 0
          ? this.diceCount
          : this.lastValidatedTurn.diceRemaining,
    }
  }

  endTurnWithFailure() {
    const player = this.getCurrentPlayer()
    const failureResult = player.failTurn()

    if (failureResult.checkpointDrop) {
      this.applyCollisionChain(player)
    }

    this.lastValidatedTurn = null
    this.advanceTurn()

    return {
      type: 'failure',
      checkpointDrop: failureResult.checkpointDrop,
      player,
    }
  }

  endTurnByStopping(turnScore, diceRemaining) {
    const player = this.getCurrentPlayer()

    if (!this.turnRules.canStop(turnScore)) {
      throw new Error('Cannot stop on a non-multiple of 100')
    }

    if (!player.hasOpened && turnScore < this.openingScore) {
      throw new Error(`Cannot open below ${this.openingScore} points`)
    }

    if (player.score + turnScore > this.targetScore) {
      return this.endTurnWithFailure()
    }

    player.validateTurn(turnScore)
    this.applyCollisionChain(player)

    if (player.score === this.targetScore) {
      this.winner = player
    }

    this.lastValidatedTurn = {
      score: turnScore,
      diceRemaining,
    }

    this.advanceTurn()

    return {
      type: 'validated',
      player,
      score: player.score,
      winner: this.winner,
    }
  }

  advanceTurn() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length
  }

  applyCollisionChain(sourcePlayer) {
    const queue = [sourcePlayer]

    while (queue.length > 0) {
      const triggerPlayer = queue.shift()

      for (const candidate of this.players) {
        if (candidate === triggerPlayer) continue
        if (candidate.score !== triggerPlayer.score) continue

        const previousScore = candidate.score
        candidate.score = candidate.previousCheckpointScore

        if (candidate.score !== previousScore) {
          queue.push(candidate)
        }
      }
    }
  }
}
