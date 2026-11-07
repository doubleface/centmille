import { applyCollisionChain } from './collisionChain.js'
import { PlayerState } from './PlayerState.js'
import { TurnRules } from './TurnRules.js'

export class Game {
  constructor(playerNames, options = {}) {
    if (!Array.isArray(playerNames) || playerNames.length < 2) {
      throw new Error('Game requires at least 2 players')
    }

    const hasInvalidPlayerName = playerNames.some(
      (name) => typeof name !== 'string' || name.trim().length === 0
    )
    if (hasInvalidPlayerName) {
      throw new Error('Player names must be non-empty strings')
    }

    this.targetScore = options.targetScore ?? 10000
    this.openingScore = options.openingScore ?? 500

    if (!Number.isInteger(this.targetScore) || this.targetScore <= 0) {
      throw new Error('targetScore must be a positive integer')
    }

    if (!Number.isInteger(this.openingScore) || this.openingScore < 0) {
      throw new Error('openingScore must be a non-negative integer')
    }

    this.players = playerNames.map((name) => new PlayerState(name))
    this.currentPlayerIndex = 0
    this.winner = null
    this.events = []

    this.turnRules = new TurnRules()
    this.undoStack = []
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex]
  }

  recordTurn(turnScore) {
    if (this.winner) throw new Error('Game is already over')
    if (!Number.isInteger(turnScore) || turnScore <= 0) {
      throw new Error('turnScore must be a positive integer')
    }
    if (!this.turnRules.canStop(turnScore)) {
      throw new Error('Cannot stop on a non-multiple of 100')
    }

    const player = this.getCurrentPlayer()
    if (!player.hasOpened && turnScore < this.openingScore) {
      throw new Error(`Cannot open below ${this.openingScore} points`)
    }

    if (player.score + turnScore > this.targetScore) {
      throw new Error(`Cannot overshoot ${this.targetScore} points`)
    }

    const previousSnapshot = this.getSnapshot()
    const currentPlayerIndex = this.currentPlayerIndex
    const scoreEvent = {
      type: 'score',
      player: player.name,
      turnScore,
      cumulative: player.score + turnScore,
    }

    const scoresBeforeCollision = this.players.map((candidate) => candidate.score)

    player.validateTurn(turnScore)
    applyCollisionChain(this.players, currentPlayerIndex)

    const actionEvents = [scoreEvent]
    for (const [index, candidate] of this.players.entries()) {
      const previousScore = scoresBeforeCollision[index]
      if (candidate.score !== previousScore && candidate !== player) {
        actionEvents.push({
          type: 'downgrade',
          player: candidate.name,
          from: previousScore,
          to: candidate.score,
        })
      }
    }

    this.events.push(...actionEvents)

    if (player.score === this.targetScore) {
      this.winner = player
    }

    this.undoStack.push({
      previousSnapshot,
      eventsAdded: actionEvents.length,
    })

    this.advanceTurn()

    return actionEvents
  }

  recordBust() {
    if (this.winner) throw new Error('Game is already over')

    const previousSnapshot = this.getSnapshot()
    const player = this.getCurrentPlayer()
    const actionEvents = [{ type: 'bust', player: player.name }]

    const scoreBeforeFailure = player.score
    const failureResult = player.failTurn()
    if (failureResult.checkpointDrop) {
      actionEvents.push({
        type: 'downgrade',
        player: player.name,
        from: scoreBeforeFailure,
        to: player.score,
      })
    }

    this.events.push(...actionEvents)
    this.undoStack.push({
      previousSnapshot,
      eventsAdded: actionEvents.length,
    })

    this.advanceTurn()

    return actionEvents
  }

  undoLastEvent() {
    const lastAction = this.undoStack.pop()
    if (!lastAction) return null

    const restored = Game.fromSnapshot(lastAction.previousSnapshot)
    this.players = restored.players
    this.currentPlayerIndex = restored.currentPlayerIndex
    this.winner = restored.winner
    this.events = restored.events

    return this.getSnapshot()
  }

  advanceTurn() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length
  }

  getSnapshot() {
    const winnerIndex = this.winner ? this.players.indexOf(this.winner) : null

    return {
      targetScore: this.targetScore,
      openingScore: this.openingScore,
      currentPlayerIndex: this.currentPlayerIndex,
      players: this.players.map((player) => ({
        name: player.name,
        score: player.score,
        previousCheckpointScore: player.previousCheckpointScore,
        checkpointHistory: [...player.checkpointHistory],
        hasOpened: player.hasOpened,
        failedTurnsInRow: player.failedTurnsInRow,
      })),
      winnerIndex,
      events: this.events.map((event) => ({ ...event })),
    }
  }

  static fromSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') {
      throw new Error('Snapshot must be an object')
    }

    if (!Array.isArray(snapshot.players) || snapshot.players.length < 2) {
      throw new Error('Snapshot must contain at least 2 players')
    }

    const playerNames = snapshot.players.map((player) => player.name)
    const game = new Game(playerNames, {
      targetScore: snapshot.targetScore,
      openingScore: snapshot.openingScore,
    })

    game.currentPlayerIndex = snapshot.currentPlayerIndex

    for (const [index, playerSnapshot] of snapshot.players.entries()) {
      const player = game.players[index]
      player.score = playerSnapshot.score
      player.previousCheckpointScore = playerSnapshot.previousCheckpointScore
      player.checkpointHistory = Array.isArray(playerSnapshot.checkpointHistory)
        ? [...playerSnapshot.checkpointHistory]
        : [0, playerSnapshot.score]
      player.hasOpened = playerSnapshot.hasOpened
      player.failedTurnsInRow = playerSnapshot.failedTurnsInRow
    }

    game.winner = snapshot.winnerIndex === null ? null : game.players[snapshot.winnerIndex]
    game.events = Array.isArray(snapshot.events)
      ? snapshot.events.map((event) => ({ ...event }))
      : []

    return game
  }
}
