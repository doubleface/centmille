import { DiceScorer } from '../rules/DiceScorer.js'
import { TurnRules } from '../rules/TurnRules.js'
import { PlayerState } from './PlayerState.js'

export class GameState {
  constructor(playerNames, options = {}) {
    if (!Array.isArray(playerNames) || playerNames.length < 2) {
      throw new Error('GameState requires at least 2 players')
    }

    const hasInvalidPlayerName = playerNames.some(
      (name) => typeof name !== 'string' || name.trim().length === 0
    )
    if (hasInvalidPlayerName) {
      throw new Error('Player names must be non-empty strings')
    }

    this.targetScore = options.targetScore ?? 10000
    this.diceCount = options.diceCount ?? 5
    this.openingScore = options.openingScore ?? 500

    if (!Number.isInteger(this.targetScore) || this.targetScore <= 0) {
      throw new Error('targetScore must be a positive integer')
    }

    if (!Number.isInteger(this.diceCount) || this.diceCount <= 0) {
      throw new Error('diceCount must be a positive integer')
    }

    if (!Number.isInteger(this.openingScore) || this.openingScore < 0) {
      throw new Error('openingScore must be a non-negative integer')
    }

    this.players = playerNames.map((name) => new PlayerState(name))
    this.currentPlayerIndex = 0
    this.turnRules = new TurnRules()
    this.diceScorer = options.diceScorer ?? new DiceScorer()
    this.lastValidatedTurn = null
    this.activeTurn = null
    this.pendingRoll = null
    this.winner = null
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex]
  }

  getStopAvailability() {
    if (!this.activeTurn) {
      return { canStop: false, blockedReason: 'Aucun tour actif', warning: null }
    }

    // Projette le score si un lancer attend d'être gardé
    let turnScore = this.activeTurn.turnScore
    if (this.pendingRoll) {
      const scoringDice = this.diceScorer.getScoringDice(this.pendingRoll.rolledDice)
      if (scoringDice.length > 0) {
        turnScore += this.diceScorer.scoreRoll(scoringDice).score
      }
    }

    if (turnScore <= 0) {
      return { canStop: false, blockedReason: 'Aucun dé gardé sur ce tour', warning: null }
    }

    if (!this.turnRules.canStop(turnScore)) {
      return {
        canStop: false,
        blockedReason: 'Le score du tour doit être un multiple de 100',
        warning: null,
      }
    }

    const player = this.getCurrentPlayer()
    if (!player.hasOpened && turnScore < this.openingScore) {
      return {
        canStop: false,
        blockedReason: `Ouverture impossible sous ${this.openingScore} points`,
        warning: null,
      }
    }

    if (player.score + turnScore > this.targetScore) {
      return {
        canStop: true,
        blockedReason: null,
        warning: `Dépassement de ${this.targetScore}: arrêter mènerait à un échec`,
      }
    }

    return { canStop: true, blockedReason: null, warning: null }
  }

  getPhase() {
    if (this.winner) return 'gameOver'
    if (!this.activeTurn) return 'awaitingTurnStart'
    if (this.pendingRoll) return 'awaitingDecision'
    return 'rolling'
  }

  getSnapshot() {
    const winnerIndex = this.winner ? this.players.indexOf(this.winner) : null

    return {
      targetScore: this.targetScore,
      diceCount: this.diceCount,
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
      lastValidatedTurn: this.lastValidatedTurn ? { ...this.lastValidatedTurn } : null,
      activeTurn: this.activeTurn ? { ...this.activeTurn } : null,
      pendingRoll: this.pendingRoll ? { rolledDice: [...this.pendingRoll.rolledDice] } : null,
      winnerIndex,
      phase: this.getPhase(),
      stop: this.getStopAvailability(),
    }
  }

  static fromSnapshot(snapshot, options = {}) {
    if (!snapshot || typeof snapshot !== 'object') {
      throw new Error('Snapshot must be an object')
    }

    if (!Array.isArray(snapshot.players) || snapshot.players.length < 2) {
      throw new Error('Snapshot must contain at least 2 players')
    }

    const playerNames = snapshot.players.map((player) => player.name)
    const game = new GameState(playerNames, {
      targetScore: snapshot.targetScore,
      diceCount: snapshot.diceCount,
      openingScore: snapshot.openingScore,
      diceScorer: options.diceScorer,
    })

    game.currentPlayerIndex = snapshot.currentPlayerIndex
    game.lastValidatedTurn = snapshot.lastValidatedTurn ? { ...snapshot.lastValidatedTurn } : null
    game.activeTurn = snapshot.activeTurn ? { ...snapshot.activeTurn } : null
    game.pendingRoll = snapshot.pendingRoll
      ? { rolledDice: [...snapshot.pendingRoll.rolledDice] }
      : null

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

    return game
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

  scoreRoll(dice) {
    const isValidDiceArray =
      Array.isArray(dice) &&
      dice.length > 0 &&
      dice.length <= this.diceCount &&
      dice.every((value) => Number.isInteger(value) && value >= 1 && value <= 6)

    if (!isValidDiceArray) {
      throw new Error(
        `Dice roll must contain between 1 and ${this.diceCount} integers in range 1-6`
      )
    }

    return this.diceScorer.scoreRoll(dice)
  }

  endTurnFromRoll(dice, diceRemaining) {
    const rollResult = this.scoreRoll(dice)
    return this.endTurnByStopping(rollResult.score, diceRemaining)
  }

  startTurn(options = {}) {
    if (this.activeTurn) {
      throw new Error('A turn is already active')
    }

    const turnStartState = this.getTurnStartState()
    const shouldSteal = options.steal ?? true
    const useSteal = turnStartState.canSteal && shouldSteal

    this.activeTurn = {
      turnScore: useSteal ? turnStartState.carriedScore : 0,
      diceToRoll: useSteal ? turnStartState.diceToRoll : this.diceCount,
      canSteal: useSteal,
    }

    if (!useSteal && turnStartState.canSteal) {
      this.lastValidatedTurn = null
    }

    return { ...this.activeTurn }
  }

  getActiveTurn() {
    if (!this.activeTurn) return null
    return { ...this.activeTurn }
  }

  recordRoll(rolledDice) {
    if (!this.activeTurn) {
      throw new Error('No active turn. Call startTurn first')
    }

    if (this.pendingRoll) {
      throw new Error('A roll is already pending. Call applyKeep first')
    }

    if (rolledDice.length !== this.activeTurn.diceToRoll) {
      throw new Error(`Expected ${this.activeTurn.diceToRoll} dice in this roll`)
    }

    const rollScore = this.scoreRoll(rolledDice)
    if (rollScore.score === 0) {
      this.activeTurn = null
      return this.endTurnWithFailure('bust', [...rolledDice])
    }

    this.pendingRoll = { rolledDice: [...rolledDice] }
    return {
      type: 'rolled',
      rolledDice: [...rolledDice],
      rollScore: rollScore.score,
    }
  }

  applyKeep(keptDice) {
    if (!this.activeTurn) {
      throw new Error('No active turn. Call startTurn first')
    }

    if (!this.pendingRoll) {
      throw new Error('No pending roll. Call recordRoll first')
    }

    if (!Array.isArray(keptDice) || keptDice.length === 0) {
      throw new Error('You must keep at least one scoring die')
    }

    const rolledDice = this.pendingRoll.rolledDice

    if (!this.isDiceSubset(keptDice, rolledDice)) {
      throw new Error('Kept dice must be a subset of rolled dice')
    }

    const keptDiceScore = this.scoreRoll(keptDice)
    if (keptDiceScore.scoringDiceCount !== keptDice.length) {
      throw new Error('All kept dice must score')
    }

    this.activeTurn.turnScore += keptDiceScore.score
    const remainingDice = this.activeTurn.diceToRoll - keptDice.length
    this.activeTurn.diceToRoll = remainingDice === 0 ? this.diceCount : remainingDice
    this.pendingRoll = null

    return {
      type: 'roll',
      turnScore: this.activeTurn.turnScore,
      diceToRoll: this.activeTurn.diceToRoll,
      keptScore: keptDiceScore.score,
    }
  }

  playRoll(rolledDice, keptDice) {
    const recordResult = this.recordRoll(rolledDice)
    if (recordResult.type === 'failure') return recordResult
    try {
      return this.applyKeep(keptDice)
    } catch (error) {
      this.pendingRoll = null
      throw error
    }
  }

  stopTurn() {
    if (!this.activeTurn) {
      throw new Error('No active turn. Call startTurn first')
    }

    const { turnScore, diceToRoll } = this.activeTurn
    this.pendingRoll = null
    const result = this.endTurnByStopping(turnScore, diceToRoll)
    this.activeTurn = null
    return result
  }

  isDiceSubset(subset, superset) {
    const counts = new Map()
    for (const value of superset) {
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }

    for (const value of subset) {
      const available = counts.get(value) ?? 0
      if (available === 0) return false
      counts.set(value, available - 1)
    }

    return true
  }

  endTurnWithFailure(reason = 'bust', rolledDice = null) {
    const player = this.getCurrentPlayer()
    this.activeTurn = null
    this.pendingRoll = null
    const failureResult = player.failTurn()

    if (failureResult.checkpointDrop) {
      this.applyCollisionChain(player)
    }

    this.lastValidatedTurn = null
    this.advanceTurn()

    return {
      type: 'failure',
      checkpointDrop: failureResult.checkpointDrop,
      reason,
      player,
      rolledDice,
    }
  }

  endTurnByStopping(turnScore, diceRemaining) {
    const player = this.getCurrentPlayer()

    if (!Number.isInteger(turnScore) || turnScore <= 0) {
      throw new Error('turnScore must be a positive integer')
    }

    if (!Number.isInteger(diceRemaining) || diceRemaining < 0 || diceRemaining > this.diceCount) {
      throw new Error(`diceRemaining must be an integer between 0 and ${this.diceCount}`)
    }

    if (!this.turnRules.canStop(turnScore)) {
      throw new Error('Cannot stop on a non-multiple of 100')
    }

    if (!player.hasOpened && turnScore < this.openingScore) {
      throw new Error(`Cannot open below ${this.openingScore} points`)
    }

    if (player.score + turnScore > this.targetScore) {
      return this.endTurnWithFailure('overshoot')
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
        candidate.dropToPreviousCheckpoint()

        if (candidate.score !== previousScore) {
          queue.push(candidate)
        }
      }
    }
  }
}
