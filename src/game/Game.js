import { evaluateAchievements } from './achievements.js'
import { drawCardByRarity, drawDistinctCards, drawRandomCard, findCard } from './cardsCatalog.js'
import { applyCollisionChain } from './collisionChain.js'
import {
  diceStopReason,
  diceToRoll,
  newDiceTurn,
  restoreDiceTurn,
  rollDiceTurn,
} from './DiceTurn.js'
import { resolveGameMode } from './GameMode.js'
import { checkMagicNumber } from './magicNumbers.js'
import { PlayerState } from './PlayerState.js'
import { TurnRules } from './TurnRules.js'
import { drawTableEvent } from './tableEvents.js'

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

    this.modeConfig = resolveGameMode(options)
    this.mode = this.modeConfig.id
    this.targetScore = this.modeConfig.targetScore
    this.openingScore = this.modeConfig.openingScore

    if (!Number.isInteger(this.targetScore) || this.targetScore <= 0) {
      throw new Error('targetScore must be a positive integer')
    }

    if (!Number.isInteger(this.openingScore) || this.openingScore < 0) {
      throw new Error('openingScore must be a non-negative integer')
    }

    this.rng = options?.rng ?? Math.random

    this.players = playerNames.map((name) => new PlayerState(name))
    this.currentPlayerIndex = 0
    this.winner = null
    this.events = []

    this.turnRules = new TurnRules({
      targetScore: this.targetScore,
      openingScore: this.openingScore,
    })
    this.undoStack = []
    this.diceMode = 'physical'
    this.diceTurn = null
    this.diceCarry = null

    this.crossedGlobalTiers = []
    this.crownHolderIndex = null
    this.crownBountyAvailable = false
    this.activeTableEvent = null
    this.turnDirection = 1
    this.turnsPlayedInRound = 0
    this.tableRoundCount = 0
    this.firstBloodAwarded = false
    this.coupDeclatAwarded = false
    this.lastPlayedCardId = null
    this.lastTurnWasBust = false
    this.welcomeCardGivenTo = []

    this.activeTurnModifiers = this.createDefaultTurnModifiers()
    this.activeBets = []
    this.activeDuels = []
    this.activeTaxCollector = null
    this.bombState = null
    this.pendingInteractions = []
    this.discoveredIds = []
  }

  createDefaultTurnModifiers() {
    return {
      arrondi: false,
      doubleur: false,
      sniper: false,
      assurance: false,
      toutOuRien: false,
      contratTarget: null,
      declarativeCards: [],
    }
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex]
  }

  setDiceMode(mode) {
    if (this.winner) throw new Error('Game is already over')
    if (!['physical', 'virtual'].includes(mode)) throw new Error('Mode de dés invalide.')
    if (mode === 'virtual' && this.modeConfig.jokersEnabled) {
      throw new Error('Les dés virtuels des variantes Bonus attendent les règles de cartes.')
    }
    if (this.diceTurn && this.diceTurn.phase !== 'ready') {
      throw new Error('Terminez le tour avant de changer de dés.')
    }
    this.diceMode = mode
    this.diceTurn = mode === 'virtual' ? newDiceTurn() : null
    this.diceCarry = null
  }

  rollDice({ takeOver = false } = {}) {
    if (this.winner) throw new Error('Game is already over')
    if (this.diceMode !== 'virtual') throw new Error('Activez les dés virtuels.')
    if (takeOver && (!this.diceCarry || this.diceTurn.phase !== 'ready')) {
      throw new Error('Aucune reprise disponible pour ce tour.')
    }
    if (this.getCurrentPlayer().score + this.diceTurn.total > this.targetScore) {
      throw new Error('La cible est dépassée : confirmez l’échec.')
    }
    const turn = takeOver ? newDiceTurn(this.diceCarry) : this.diceTurn
    const faces = Array.from({ length: diceToRoll(turn) }, () => Math.floor(this.rng() * 6) + 1)
    this.diceTurn = rollDiceTurn(turn, faces)
    this.diceCarry = null
  }

  finishDiceTurn() {
    if (this.diceMode !== 'virtual') throw new Error('Activez les dés virtuels.')
    if (this.diceTurn.phase === 'bust') return this.recordBust()
    if (this.getCurrentPlayer().score + this.diceTurn.total > this.targetScore) {
      return this.recordBust()
    }
    const reason = diceStopReason(this.diceTurn, this.getCurrentPlayer(), this.openingScore)
    if (reason) throw new Error(reason)
    return this.recordTurn(this.diceTurn.total)
  }

  markDiscovered(key) {
    if (!this.discoveredIds.includes(key)) {
      this.discoveredIds.push(key)
      return true
    }
    return false
  }

  drawModeCardByRarity(rarity, excludeIds = []) {
    return drawCardByRarity(rarity, this.rng, excludeIds, this.modeConfig.deckCardIds)
  }

  drawModeRandomCard(excludeIds = []) {
    return drawRandomCard(this.rng, excludeIds, {
      weights: this.modeConfig.rarityWeights,
      allowedIds: this.modeConfig.deckCardIds,
    })
  }

  drawModeDistinctCards(count) {
    return drawDistinctCards(count, this.rng, {
      weights: this.modeConfig.rarityWeights,
      allowedIds: this.modeConfig.deckCardIds,
    })
  }

  giveCardToPlayer(playerIndex, cardId, actionEvents = this.events, reason = 'draw') {
    const card = findCard(cardId)
    if (!card) return

    const player = this.players[playerIndex]
    if (!player) return

    const firstDiscovery = this.markDiscovered(`card:${cardId}`)
    const handLimit = this.modeConfig.handLimit ?? 3
    if (player.hand.length < handLimit) {
      player.hand.push(cardId)
      actionEvents.push({
        type: 'card-drawn',
        player: player.name,
        cardId,
        rarity: card.rarity,
        soundId: card.soundId,
        reason,
        firstDiscovery,
      })
    } else {
      this.pendingInteractions.push({
        type: 'hand-overflow',
        playerIndex,
        player: player.name,
        incomingCardId: cardId,
        choices: [...player.hand, cardId],
      })
      actionEvents.push({
        type: 'card-drawn',
        player: player.name,
        cardId,
        rarity: card.rarity,
        soundId: card.soundId,
        reason,
        firstDiscovery,
        overflow: true,
      })
    }
  }

  playCard(cardId, payload = {}) {
    if (this.winner) throw new Error('Game is already over')
    if (!this.modeConfig.jokersEnabled) {
      throw new Error('Jokers are not enabled in this mode')
    }

    const player = this.getCurrentPlayer()
    const cardIndex = player.hand.indexOf(cardId)
    if (cardIndex === -1) {
      throw new Error('Card is not in player hand')
    }

    const card = findCard(cardId)
    if (!card) {
      throw new Error(`Unknown card: ${cardId}`)
    }

    if (
      this.modeConfig.redZoneEnabled &&
      player.score >= this.modeConfig.redZoneThreshold &&
      card.isOffensive
    ) {
      throw new Error('Cannot play offensive card in Red Zone')
    }

    if (cardId === 'aspirateur' && !this.lastTurnWasBust) {
      throw new Error('Previous turn was not a bust')
    }

    if (cardId === 'contrat') {
      if (
        !Number.isInteger(payload.targetScore) ||
        payload.targetScore < 300 ||
        payload.targetScore % 100 !== 0
      ) {
        throw new Error('Contrat requires targetScore >= 300 and multiple of 100')
      }
    }

    if (cardId === 'echo' && this.lastPlayedCardId === null) {
      throw new Error('No previous card to echo')
    }

    const instantTargetCards = [
      'gel',
      'malediction',
      'parieur',
      'bombe',
      'duel',
      'troc',
      'main-faible',
      'aveugle',
      'annonceur',
    ]
    if (instantTargetCards.includes(cardId)) {
      if (
        !Number.isInteger(payload.targetIndex) ||
        payload.targetIndex < 0 ||
        payload.targetIndex >= this.players.length ||
        payload.targetIndex === this.currentPlayerIndex
      ) {
        throw new Error('Invalid target player')
      }
    }

    if (cardId === 'pickpocket') {
      const amount = this.modeConfig.pickpocketAmount ?? 1000
      const hasValidOpponentLeader = this.players.some(
        (p, idx) => idx !== this.currentPlayerIndex && p.score >= amount
      )
      if (!hasValidOpponentLeader) {
        throw new Error(`No opponent with at least ${amount} points`)
      }
    }

    if (cardId === 'teleporteur') {
      const hasTarget = this.players.some(
        (p, idx) =>
          idx !== this.currentPlayerIndex &&
          p.score > player.score &&
          p.score <= player.score + 3000
      )
      if (!hasTarget) {
        throw new Error('No player ahead within 3000 points')
      }
    }

    const previousSnapshot = this.getSnapshot()
    player.hand.splice(cardIndex, 1)

    const actionEvents = []
    this.executeCardEffect(cardId, payload, actionEvents)

    if (cardId !== 'echo') {
      this.lastPlayedCardId = cardId
    }

    if (player.score === this.targetScore) {
      this.winner = player
    }

    this.events.push(...actionEvents)
    this.undoStack.push({
      previousSnapshot,
      eventsAdded: actionEvents.length,
    })

    return actionEvents
  }

  executeCardEffect(cardId, payload, actionEvents) {
    const card = findCard(cardId)
    const player = this.getCurrentPlayer()

    actionEvents.push({
      type: 'card-played',
      player: player.name,
      cardId,
      soundId: card?.soundId,
    })

    let targetIndex = payload.targetIndex
    if (card?.isOffensive && Number.isInteger(targetIndex)) {
      const targetCandidate = this.players[targetIndex]
      const boomerangIndex = targetCandidate.hand.indexOf('boomerang')
      if (boomerangIndex !== -1) {
        targetCandidate.hand.splice(boomerangIndex, 1)
        const firstDiscovery = this.markDiscovered('card:boomerang')
        actionEvents.push({
          type: 'boomerang',
          player: targetCandidate.name,
          attacker: player.name,
          cardId,
          soundId: 'rarity-legendary',
          firstDiscovery,
        })
        targetIndex = this.currentPlayerIndex
      }
    }

    const targetPlayer = Number.isInteger(targetIndex) ? this.players[targetIndex] : null

    switch (cardId) {
      case 'arrondi':
        this.activeTurnModifiers.arrondi = true
        break
      case 'doubleur':
        this.activeTurnModifiers.doubleur = true
        break
      case 'sniper':
        this.activeTurnModifiers.sniper = true
        break
      case 'assurance':
        this.activeTurnModifiers.assurance = true
        break
      case 'tout-ou-rien':
        this.activeTurnModifiers.toutOuRien = true
        break
      case 'contrat':
        this.activeTurnModifiers.contratTarget = payload.targetScore
        break
      case 'aspirateur':
      case 'sixieme-sens':
      case 'seconde-chance':
      case 'reset':
      case 'convertisseur':
      case 'cameleon':
      case 'petite-suite':
      case 'aimant':
        this.activeTurnModifiers.declarativeCards.push(cardId)
        break
      case 'gel':
        targetPlayer.status.frozen = true
        break
      case 'malediction':
        targetPlayer.status.cursed = true
        break
      case 'parieur':
        this.activeBets.push({
          betterIndex: this.currentPlayerIndex,
          targetIndex,
        })
        break
      case 'bombe':
        this.bombState = { holderIndex: targetIndex, remainingTableRounds: 3 }
        break
      case 'duel':
        this.activeDuels.push({
          challengerIndex:
            targetIndex === this.currentPlayerIndex ? payload.targetIndex : this.currentPlayerIndex,
          targetIndex,
          challengerScore: null,
          targetScore: null,
        })
        break
      case 'percepteur':
        this.activeTaxCollector = {
          collectorIndex: this.currentPlayerIndex,
          remainingTurns: this.players.length,
        }
        break
      case 'pickpocket': {
        const amount = this.modeConfig.pickpocketAmount ?? 1000
        let leaderIndex = -1
        let maxScore = -1
        for (const [idx, p] of this.players.entries()) {
          if (idx !== this.currentPlayerIndex && p.score >= amount && p.score > maxScore) {
            maxScore = p.score
            leaderIndex = idx
          }
        }
        if (leaderIndex !== -1) {
          const leader = this.players[leaderIndex]
          leader.adjustScore(-amount)
          player.adjustScore(amount)
          actionEvents.push({
            type: 'pickpocket',
            thief: player.name,
            victim: leader.name,
            amount,
          })
        }
        break
      }
      case 'teleporteur': {
        let targetIdx = -1
        let minGap = Infinity
        for (const [idx, p] of this.players.entries()) {
          if (
            idx !== this.currentPlayerIndex &&
            p.score > player.score &&
            p.score <= player.score + 3000
          ) {
            const gap = p.score - player.score
            if (gap < minGap) {
              minGap = gap
              targetIdx = idx
            }
          }
        }
        if (targetIdx !== -1) {
          const target = this.players[targetIdx]
          const oldPlayerScore = player.score
          const oldTargetScore = target.score
          player.adjustScore(oldTargetScore - oldPlayerScore)
          target.adjustScore(oldPlayerScore - oldTargetScore)
          actionEvents.push({
            type: 'teleporteur',
            player: player.name,
            target: target.name,
            playerScore: player.score,
            targetScore: target.score,
          })
        }
        break
      }
      case 'troc': {
        if (player.hand.length > 0 && targetPlayer.hand.length > 0) {
          const pIdx = Math.floor(this.rng() * player.hand.length)
          const tIdx = Math.floor(this.rng() * targetPlayer.hand.length)
          const pCard = player.hand[pIdx]
          const tCard = targetPlayer.hand[tIdx]
          player.hand[pIdx] = tCard
          targetPlayer.hand[tIdx] = pCard
          actionEvents.push({
            type: 'troc',
            player: player.name,
            target: targetPlayer.name,
            givenCardId: pCard,
            receivedCardId: tCard,
          })
        }
        break
      }
      case 'vampire':
        player.status.vampire = true
        break
      case 'effaceur':
        player.failedTurnsInRow = 0
        break
      case 'fantome':
        player.status.ghost = true
        break
      case 'bis':
        player.status.extraTurn = true
        break
      case 'pandore':
        if (this.rng() < 0.5) {
          const legCard = this.drawModeCardByRarity('legendary')
          if (legCard) {
            this.giveCardToPlayer(this.currentPlayerIndex, legCard.id, actionEvents, 'pandora')
          }
        } else {
          player.status.cursed = true
          actionEvents.push({
            type: 'pandora-curse',
            player: player.name,
            soundId: 'curse',
          })
        }
        break
      case 'main-faible':
        if (payload.refuseGage === true) {
          targetPlayer.adjustScore(-500)
          actionEvents.push({
            type: 'gage-refused',
            player: targetPlayer.name,
            cardId: 'main-faible',
            penalty: 500,
          })
        } else {
          actionEvents.push({
            type: 'gage',
            player: targetPlayer.name,
            cardId: 'main-faible',
          })
        }
        break
      case 'aveugle':
      case 'annonceur':
        actionEvents.push({
          type: 'gage',
          player: targetPlayer.name,
          cardId,
        })
        break
      case 'echo':
        if (this.lastPlayedCardId) {
          this.executeCardEffect(this.lastPlayedCardId, payload, actionEvents)
        }
        break
    }
  }

  isUniqueLast(playerIndex) {
    const target = this.players[playerIndex]
    return this.players.every((p, idx) => idx === playerIndex || target.score < p.score)
  }

  isUniqueFirst(playerIndex) {
    const target = this.players[playerIndex]
    return this.players.every((p, idx) => idx === playerIndex || target.score > p.score)
  }

  resolveDuels(playerIndex, turnScore, actionEvents) {
    const remainingDuels = []
    for (const duel of this.activeDuels) {
      if (duel.challengerIndex === playerIndex && duel.challengerScore === null) {
        duel.challengerScore = turnScore
      } else if (duel.targetIndex === playerIndex && duel.targetScore === null) {
        duel.targetScore = turnScore
      }

      if (duel.challengerScore !== null && duel.targetScore !== null) {
        const challenger = this.players[duel.challengerIndex]
        const target = this.players[duel.targetIndex]
        if (duel.challengerScore > duel.targetScore) {
          challenger.adjustScore(1000)
          target.adjustScore(-1000)
          actionEvents.push({
            type: 'duel-resolved',
            winner: challenger.name,
            loser: target.name,
          })
        } else if (duel.targetScore > duel.challengerScore) {
          target.adjustScore(1000)
          challenger.adjustScore(-1000)
          actionEvents.push({
            type: 'duel-resolved',
            winner: target.name,
            loser: challenger.name,
          })
        }
      } else {
        remainingDuels.push(duel)
      }
    }
    this.activeDuels = remainingDuels
  }

  handleConsolation(playerIndex, actionEvents, source = 'drop') {
    if (!this.modeConfig.jokersEnabled) return
    if (this.modeConfig.consolationCollisionOnly && source !== 'collision') return

    const player = this.players[playerIndex]
    const prob = this.modeConfig.consolationProbability ?? 1 / 3
    if (player.unrewardedDrops >= 2 || this.rng() < prob) {
      player.unrewardedDrops = 0
      const card = this.drawModeCardByRarity('common')
      if (card) {
        this.giveCardToPlayer(playerIndex, card.id, actionEvents, 'consolation')
        actionEvents.push({
          type: 'consolation',
          player: player.name,
          cardId: card.id,
          soundId: 'consolation',
        })
      }
    } else {
      player.unrewardedDrops += 1
    }
  }

  handlePlayerDrop(playerIndex, attackerIndex, dropCount, actionEvents, reason) {
    const player = this.players[playerIndex]
    const from = player.score
    const checkpointsBefore = [...player.checkpointHistory]

    player.dropMultipleCheckpoints(dropCount)
    const to = player.score

    if (from !== to) {
      actionEvents.push({
        type: 'downgrade',
        player: player.name,
        from,
        to,
        reason,
      })
      const source = attackerIndex !== null && attackerIndex !== undefined ? 'collision' : 'drop'
      this.handleConsolation(playerIndex, actionEvents, source)

      const availableCards = player.hand.filter((id) =>
        attackerIndex !== null && attackerIndex !== undefined
          ? ['bouclier', 'parachute', 'miroir'].includes(id)
          : ['bouclier', 'parachute'].includes(id)
      )

      if (availableCards.length > 0) {
        this.pendingInteractions.push({
          type: 'defensive-reaction',
          victimIndex: playerIndex,
          attackerIndex: attackerIndex ?? null,
          from,
          to,
          checkpointHistoryBefore: checkpointsBefore,
          availableCards,
        })
      }
    }
  }

  checkTiersCrossed(playerIndex, actionEvents) {
    const player = this.players[playerIndex]
    const tiers = this.modeConfig.tiers ?? []

    for (const tier of tiers) {
      if (player.score >= tier && player.highestTierReached < tier) {
        if (player.hand.length > 0) {
          actionEvents.push({
            type: 'cards-expired',
            player: player.name,
            cards: [...player.hand],
          })
          player.hand = []
        }
        player.status.ghost = false
        player.status.vampire = false
        player.highestTierReached = tier

        actionEvents.push({
          type: 'tier-crossed',
          player: player.name,
          tier,
          soundId: 'tier-crossed',
        })

        if (!this.crossedGlobalTiers.includes(tier)) {
          this.crossedGlobalTiers.push(tier)
          let recipientPlayerIndex = -1
          let lowestScore = Infinity
          for (const [idx, p] of this.players.entries()) {
            if (idx !== playerIndex && p.score < lowestScore) {
              lowestScore = p.score
              recipientPlayerIndex = idx
            }
          }
          if (recipientPlayerIndex !== -1) {
            const cards = this.drawModeDistinctCards(3)
            this.pendingInteractions.push({
              type: 'architect',
              tier,
              architectPlayerIndex: playerIndex,
              recipientPlayerIndex,
              choices: cards.map((c) => c.id),
            })
          }
          this.triggerRandomTableEvent(actionEvents)
        }

        if (this.modeConfig.shopEnabled && player.score >= 1000) {
          this.pendingInteractions.push({
            type: 'shop',
            playerIndex,
            tier,
          })
        }
      }
    }
  }

  triggerRandomTableEvent(actionEvents = this.events) {
    if (!this.modeConfig.tableEventsEnabled) return
    const event = drawTableEvent(this.rng, this.modeConfig.allowedTableEventIds)
    if (!event) return

    this.activeTableEvent = {
      id: event.id,
      name: event.name,
      emoji: event.emoji,
      description: event.description,
      type: event.type,
      remainingTurns: this.players.length,
    }

    const firstDiscovery = this.markDiscovered(`event:${event.id}`)
    actionEvents.push({
      type: 'table-event',
      eventId: event.id,
      name: event.name,
      description: event.description,
      soundId: event.soundId,
      firstDiscovery,
    })

    if (event.id === 'sens-inverse') {
      this.turnDirection *= -1
    } else if (event.id === 'pluie-de-cartes') {
      for (let i = 0; i < this.players.length; i++) {
        const card = this.drawModeCardByRarity('common')
        if (card) {
          this.giveCardToPlayer(i, card.id, actionEvents, 'table-event')
        }
      }
    } else if (event.id === 'mutinerie') {
      const sortedIndices = [...this.players.keys()].sort(
        (a, b) => this.players[a].score - this.players[b].score
      )
      const lastPlayerIndex = sortedIndices[0]
      const firstPlayerIndex = sortedIndices[sortedIndices.length - 1]
      const firstPlayer = this.players[firstPlayerIndex]
      const lastPlayer = this.players[lastPlayerIndex]
      if (firstPlayerIndex !== lastPlayerIndex && firstPlayer.hand.length > 0) {
        const cardIndex = Math.floor(this.rng() * firstPlayer.hand.length)
        const [stolenCardId] = firstPlayer.hand.splice(cardIndex, 1)
        this.giveCardToPlayer(lastPlayerIndex, stolenCardId, actionEvents, 'mutinerie')
        actionEvents.push({
          type: 'mutinerie-theft',
          victim: firstPlayer.name,
          thief: lastPlayer.name,
          cardId: stolenCardId,
        })
      }
    }
  }

  recordTurn(turnScore, turnOptions = {}) {
    if (this.winner) throw new Error('Game is already over')
    if (this.diceMode === 'virtual') {
      const reason = diceStopReason(this.diceTurn, this.getCurrentPlayer(), this.openingScore)
      if (reason) throw new Error(reason)
      if (turnScore !== this.diceTurn.total) throw new Error('Validez le cumul calculé des dés.')
    }
    if (!Number.isInteger(turnScore) || turnScore <= 0) {
      throw new Error('turnScore must be a positive integer')
    }

    if (!this.modeConfig.jokersEnabled) {
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

      this.diceCarry =
        this.diceMode === 'virtual' && !this.winner
          ? [...this.diceTurn.inheritedRolls, ...this.diceTurn.rolls].map((faces) => [...faces])
          : null
      this.advanceTurn()

      return actionEvents
    }

    const player = this.getCurrentPlayer()

    if (
      this.activeTurnModifiers.contratTarget !== null &&
      turnScore !== this.activeTurnModifiers.contratTarget
    ) {
      this.activeTurnModifiers = this.createDefaultTurnModifiers()
      return this.recordBust()
    }

    if (this.activeTurnModifiers.toutOuRien && turnScore < 1000) {
      this.activeTurnModifiers = this.createDefaultTurnModifiers()
      return this.recordBust({ extraPenalty: 1 })
    }

    if (player.status.cursed) {
      player.status.cursed = false
      if (turnScore < 500) {
        this.activeTurnModifiers = this.createDefaultTurnModifiers()
        return this.recordBust()
      }
    }

    if (
      !this.turnRules.canStop(turnScore, {
        allowNonMultipleOf100: this.activeTurnModifiers.arrondi,
      })
    ) {
      throw new Error('Cannot stop on a non-multiple of 100')
    }

    let effectiveScore = this.turnRules.applyRounding(turnScore, {
      roundUpTo100: this.activeTurnModifiers.arrondi,
    })
    if (this.activeTurnModifiers.contratTarget !== null) {
      effectiveScore *= 2
    }
    if (this.activeTurnModifiers.doubleur) {
      effectiveScore *= 2
    }
    if (this.activeTurnModifiers.toutOuRien) {
      effectiveScore *= 3
    }

    if (!player.hasOpened && effectiveScore < this.openingScore) {
      throw new Error(`Cannot open below ${this.openingScore} points`)
    }

    if (player.score + effectiveScore > this.targetScore) {
      throw new Error(`Cannot overshoot ${this.targetScore} points`)
    }

    const wasUniqueLastBeforeTurn = this.isUniqueLast(this.currentPlayerIndex)
    const failedTurnsBeforeTurn = player.failedTurnsInRow
    const scoreBeforeLastDrop = player.scoreBeforeLastDrop
    const recoveredFromDrop =
      scoreBeforeLastDrop !== null &&
      effectiveScore >= 2000 &&
      player.score + effectiveScore >= scoreBeforeLastDrop

    const previousSnapshot = this.getSnapshot()
    const currentPlayerIndex = this.currentPlayerIndex

    player.validateTurn(effectiveScore)
    player.scoreBeforeLastDrop = null

    const actionEvents = [
      {
        type: 'score',
        player: player.name,
        turnScore: effectiveScore,
        cumulative: player.score,
      },
    ]

    if (
      this.activeTaxCollector &&
      this.activeTaxCollector.collectorIndex !== currentPlayerIndex &&
      effectiveScore >= 1000 &&
      player.score >= 200 &&
      player.score < this.targetScore
    ) {
      const collector = this.players[this.activeTaxCollector.collectorIndex]
      player.adjustScore(-200)
      collector.adjustScore(200)
      actionEvents.push({
        type: 'tax-paid',
        from: player.name,
        to: collector.name,
        amount: 200,
      })
    }

    if (this.bombState?.holderIndex === currentPlayerIndex && effectiveScore >= 1000) {
      let nextHolder = turnOptions.bombTargetIndex
      if (
        !Number.isInteger(nextHolder) ||
        nextHolder < 0 ||
        nextHolder >= this.players.length ||
        nextHolder === currentPlayerIndex
      ) {
        nextHolder = (currentPlayerIndex + 1) % this.players.length
      }
      this.bombState.holderIndex = nextHolder
      actionEvents.push({
        type: 'bomb-passed',
        from: player.name,
        to: this.players[nextHolder].name,
      })
    }

    this.resolveDuels(currentPlayerIndex, effectiveScore, actionEvents)

    this.activeBets = this.activeBets.filter((bet) => bet.targetIndex !== currentPlayerIndex)

    this.checkTiersCrossed(currentPlayerIndex, actionEvents)

    if (
      typeof this.modeConfig.welcomeCardThreshold === 'number' &&
      player.score >= this.modeConfig.welcomeCardThreshold &&
      !this.welcomeCardGivenTo.includes(currentPlayerIndex)
    ) {
      this.welcomeCardGivenTo.push(currentPlayerIndex)
      const card = this.drawModeCardByRarity('common')
      if (card) {
        this.giveCardToPlayer(currentPlayerIndex, card.id, actionEvents, 'welcome')
      }
    }

    if (this.modeConfig.magicNumbersEnabled) {
      const magic = checkMagicNumber(player.score, this.mode)
      const isClaimedExactTier =
        magic?.id === 'exact-tier' && player.exactTiersClaimed.includes(player.score)
      if (magic && !isClaimedExactTier) {
        if (magic.id === 'exact-tier') {
          player.exactTiersClaimed.push(player.score)
        }
        const firstDiscovery = this.markDiscovered(`magic:${magic.id}`)
        actionEvents.push({
          type: 'magic-number',
          player: player.name,
          magicId: magic.id,
          name: magic.name,
          soundId: magic.soundId,
          firstDiscovery,
        })
        switch (magic.id) {
          case 'lucky-repdigit': {
            const card = this.drawModeRandomCard()
            if (card) {
              this.giveCardToPlayer(currentPlayerIndex, card.id, actionEvents, 'magic-number')
            }
            break
          }
          case 'ascending':
            if (player.score + 1000 <= this.targetScore) {
              player.adjustScore(1000)
            }
            break
          case 'exact-tier':
            this.giveCardToPlayer(currentPlayerIndex, 'bouclier', actionEvents, 'magic-number')
            break
          case 'devil':
            this.handlePlayerDrop(currentPlayerIndex, null, 1, actionEvents, 'devil')
            break
          case 'answer-42': {
            const choices = this.drawModeDistinctCards(2)
            this.pendingInteractions.push({
              type: 'answer-42',
              playerIndex: currentPlayerIndex,
              choices: choices.map((c) => c.id),
            })
            break
          }
          case 'black-cat':
            player.status.cursed = true
            break
          case 'jackpot': {
            const card = this.drawModeCardByRarity('legendary')
            if (card) {
              this.giveCardToPlayer(currentPlayerIndex, card.id, actionEvents, 'magic-number')
            }
            break
          }
        }
      }
    }

    const isTempete = this.activeTableEvent?.id === 'tempete'
    const isTreve = this.activeTableEvent?.id === 'treve'
    const directDropCount = this.activeTurnModifiers.sniper || isTempete ? 2 : 1
    const cascadeDropCount = isTempete ? 2 : 1
    const checkpointsBeforeCollision = this.players.map((p) => [...p.checkpointHistory])

    const collisions = applyCollisionChain(this.players, currentPlayerIndex, {
      truce: isTreve,
      directDropCount,
      cascadeDropCount,
    })

    for (const collision of collisions) {
      actionEvents.push({
        type: 'downgrade',
        player: collision.player,
        from: collision.from,
        to: collision.to,
      })

      if (
        player.status.vampire &&
        collision.attackerIndex === currentPlayerIndex &&
        player.score + 500 <= this.targetScore
      ) {
        player.adjustScore(500)
        actionEvents.push({
          type: 'vampire-drain',
          player: player.name,
          amount: 500,
        })
      }

      if (
        this.modeConfig.crownEnabled &&
        this.crownHolderIndex === collision.victimIndex &&
        this.crownBountyAvailable &&
        collision.attackerIndex !== collision.victimIndex
      ) {
        this.crownBountyAvailable = false
        const rareCard = this.drawModeCardByRarity('rare')
        if (rareCard) {
          this.giveCardToPlayer(collision.attackerIndex, rareCard.id, actionEvents, 'crown-bounty')
        }
        actionEvents.push({
          type: 'bounty-claimed',
          hunter: this.players[collision.attackerIndex].name,
          leader: collision.player,
          soundId: 'crown',
        })
      }

      this.handleConsolation(collision.victimIndex, actionEvents, 'collision')

      const victim = this.players[collision.victimIndex]
      const availableCards = victim.hand.filter((id) =>
        ['bouclier', 'parachute', 'miroir'].includes(id)
      )
      if (availableCards.length > 0) {
        this.pendingInteractions.push({
          type: 'defensive-reaction',
          victimIndex: collision.victimIndex,
          attackerIndex: collision.attackerIndex,
          from: collision.from,
          to: collision.to,
          checkpointHistoryBefore: checkpointsBeforeCollision[collision.victimIndex],
          availableCards,
        })
      }
    }

    if (
      this.modeConfig.redZoneEnabled &&
      player.score >= this.modeConfig.redZoneThreshold &&
      !player.hasEnteredRedZoneBefore
    ) {
      player.hasEnteredRedZoneBefore = true
      actionEvents.push({
        type: 'red-zone',
        player: player.name,
        soundId: 'red-zone',
        threshold: this.modeConfig.redZoneThreshold,
        sabotage: Boolean(this.modeConfig.redZoneSabotageEnabled),
      })
      if (this.modeConfig.redZoneSabotageEnabled) {
        const sabotageCards = ['malediction', 'gel', 'bombe']
        for (const [idx] of this.players.entries()) {
          if (idx !== currentPlayerIndex) {
            const cardId = sabotageCards[idx % sabotageCards.length]
            this.giveCardToPlayer(idx, cardId, actionEvents, 'red-zone-sabotage')
          }
        }
      }
    }

    if (this.modeConfig.achievementsEnabled) {
      const isFirstBloodOfGame = !this.firstBloodAwarded && collisions.length > 0
      const unlocked = evaluateAchievements({
        turnScore: effectiveScore,
        collisionsCount: collisions.length,
        isFirstBloodOfGame,
        recoveredFromDrop,
        wasUniqueLastBeforeTurn,
        isUniqueFirstAfterTurn: this.isUniqueFirst(currentPlayerIndex),
        failedTurnsBeforeTurn,
        alreadyUnlockedIds: player.achievements,
        coupDeclatAlreadyAwarded: this.coupDeclatAwarded,
        allowedIds: this.modeConfig.allowedAchievementIds,
      })

      if (isFirstBloodOfGame) {
        this.firstBloodAwarded = true
      }
      if (unlocked.some((a) => a.id === 'coup-declat')) {
        this.coupDeclatAwarded = true
      }

      for (const ach of unlocked) {
        player.achievements.push(ach.id)
        const firstDiscovery = this.markDiscovered(`achievement:${ach.id}`)
        actionEvents.push({
          type: 'achievement',
          player: player.name,
          achievementId: ach.id,
          name: ach.name,
          soundId: 'achievement',
          firstDiscovery,
        })
        const bonusCard = this.drawModeCardByRarity('common')
        if (bonusCard) {
          this.giveCardToPlayer(currentPlayerIndex, bonusCard.id, actionEvents, 'achievement')
        }
      }
    }

    this.activeTurnModifiers = this.createDefaultTurnModifiers()
    this.lastTurnWasBust = false

    if (player.score === this.targetScore) {
      this.winner = player
    }

    this.events.push(...actionEvents)
    this.undoStack.push({
      previousSnapshot,
      eventsAdded: actionEvents.length,
    })

    this.advanceTurn()

    return actionEvents
  }

  recordBust(bustOptions = {}) {
    if (this.winner) throw new Error('Game is already over')
    if (this.diceMode === 'virtual' && this.diceTurn.phase !== 'bust') {
      const overshoots = this.getCurrentPlayer().score + this.diceTurn.total > this.targetScore
      if (this.diceTurn.phase !== 'playing' || !overshoots) {
        throw new Error('Le lancer ne constitue pas une broucouille.')
      }
    }

    if (
      this.activeTurnModifiers.assurance &&
      Number.isInteger(bustOptions.accumulatedPoints) &&
      bustOptions.accumulatedPoints >= 200
    ) {
      const savedScore = Math.floor(bustOptions.accumulatedPoints / 200) * 100
      this.activeTurnModifiers.assurance = false
      return this.recordTurn(savedScore)
    }

    const previousSnapshot = this.getSnapshot()
    this.diceCarry = null
    const player = this.getCurrentPlayer()
    const currentPlayerIndex = this.currentPlayerIndex
    const actionEvents = [{ type: 'bust', player: player.name }]

    for (const bet of this.activeBets) {
      if (bet.targetIndex === currentPlayerIndex) {
        const better = this.players[bet.betterIndex]
        better.adjustScore(1000)
        actionEvents.push({
          type: 'bet-won',
          player: better.name,
          target: player.name,
          amount: 1000,
        })
      }
    }
    this.activeBets = this.activeBets.filter((bet) => bet.targetIndex !== currentPlayerIndex)

    this.resolveDuels(currentPlayerIndex, 0, actionEvents)

    const scoreBeforeFailure = player.score
    const checkpointsBefore = [...player.checkpointHistory]
    const extraPenalty = this.activeTurnModifiers.toutOuRien ? 1 : (bustOptions.extraPenalty ?? 0)
    const failureResult = player.failTurn({ extraPenalty })

    if (failureResult.checkpointDrop) {
      actionEvents.push({
        type: 'downgrade',
        player: player.name,
        from: scoreBeforeFailure,
        to: player.score,
      })

      if (this.modeConfig.jokersEnabled) {
        this.handleConsolation(currentPlayerIndex, actionEvents, 'drop')
        const availableCards = player.hand.filter((id) => ['bouclier', 'parachute'].includes(id))
        if (availableCards.length > 0) {
          this.pendingInteractions.push({
            type: 'defensive-reaction',
            victimIndex: currentPlayerIndex,
            attackerIndex: null,
            from: scoreBeforeFailure,
            to: player.score,
            checkpointHistoryBefore: checkpointsBefore,
            availableCards,
          })
        }
      }
    }

    this.activeTurnModifiers = this.createDefaultTurnModifiers()
    this.lastTurnWasBust = true

    this.events.push(...actionEvents)
    this.undoStack.push({
      previousSnapshot,
      eventsAdded: actionEvents.length,
    })

    this.advanceTurn()

    return actionEvents
  }

  updateCrownAtEndOfRound() {
    if (!this.modeConfig.crownEnabled) return

    let highestScore = 0
    let leaderIndex = null
    let countWithMax = 0

    for (const [index, player] of this.players.entries()) {
      if (player.score > highestScore) {
        highestScore = player.score
        leaderIndex = index
        countWithMax = 1
      } else if (player.score === highestScore && highestScore > 0) {
        countWithMax += 1
      }
    }

    if (countWithMax === 1 && leaderIndex !== null && leaderIndex !== this.crownHolderIndex) {
      this.crownHolderIndex = leaderIndex
      this.crownBountyAvailable = true
      this.events.push({
        type: 'crown-changed',
        player: this.players[leaderIndex].name,
        soundId: 'crown',
      })
    }
  }

  advanceTurn() {
    if (this.diceMode === 'virtual') this.diceTurn = newDiceTurn()
    if (!this.modeConfig.jokersEnabled) {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length
      return
    }

    const currentPlayer = this.getCurrentPlayer()
    if (currentPlayer.status.extraTurn) {
      currentPlayer.status.extraTurn = false
      return
    }

    if (this.activeTableEvent) {
      this.activeTableEvent.remainingTurns -= 1
      if (this.activeTableEvent.remainingTurns <= 0) {
        this.activeTableEvent = null
        this.turnDirection = 1
      }
    }

    if (this.activeTaxCollector) {
      this.activeTaxCollector.remainingTurns -= 1
      if (this.activeTaxCollector.remainingTurns <= 0) {
        this.activeTaxCollector = null
      }
    }

    this.turnsPlayedInRound += 1
    this.currentPlayerIndex =
      (this.currentPlayerIndex + this.turnDirection + this.players.length) % this.players.length

    if (this.turnsPlayedInRound >= this.players.length) {
      this.turnsPlayedInRound = 0
      this.tableRoundCount += 1
      if (this.modeConfig.crownEnabled) {
        this.updateCrownAtEndOfRound()
      }

      if (this.bombState) {
        this.bombState.remainingTableRounds -= 1
        if (this.bombState.remainingTableRounds <= 0) {
          const holderIndex = this.bombState.holderIndex
          const holder = this.players[holderIndex]
          const from = holder.score
          const checkpointsBefore = [...holder.checkpointHistory]
          holder.dropMultipleCheckpoints(1)
          const to = holder.score
          this.events.push({
            type: 'bomb-exploded',
            player: holder.name,
            from,
            to,
            soundId: 'bomb',
          })
          this.handleConsolation(holderIndex, this.events, 'drop')
          const availableCards = holder.hand.filter((id) => ['bouclier', 'parachute'].includes(id))
          if (availableCards.length > 0) {
            this.pendingInteractions.push({
              type: 'defensive-reaction',
              victimIndex: holderIndex,
              attackerIndex: null,
              from,
              to,
              checkpointHistoryBefore: checkpointsBefore,
              availableCards,
            })
          }
          this.bombState = null
        }
      }

      if (
        this.modeConfig.tableEventsEnabled &&
        this.modeConfig.periodicTableEventsEnabled &&
        this.tableRoundCount > 0 &&
        this.tableRoundCount % 10 === 0 &&
        !this.activeTableEvent
      ) {
        this.triggerRandomTableEvent(this.events)
      }
    }

    let frozenSkipCount = 0
    while (this.getCurrentPlayer().status.frozen && frozenSkipCount < this.players.length) {
      frozenSkipCount += 1
      const frozenPlayer = this.getCurrentPlayer()
      frozenPlayer.status.frozen = false
      this.events.push({
        type: 'turn-skipped-frozen',
        player: frozenPlayer.name,
      })

      if (this.activeTableEvent) {
        this.activeTableEvent.remainingTurns -= 1
        if (this.activeTableEvent.remainingTurns <= 0) {
          this.activeTableEvent = null
          this.turnDirection = 1
        }
      }

      if (this.activeTaxCollector) {
        this.activeTaxCollector.remainingTurns -= 1
        if (this.activeTaxCollector.remainingTurns <= 0) {
          this.activeTaxCollector = null
        }
      }

      this.turnsPlayedInRound += 1
      this.currentPlayerIndex =
        (this.currentPlayerIndex + this.turnDirection + this.players.length) % this.players.length

      if (this.turnsPlayedInRound >= this.players.length) {
        this.turnsPlayedInRound = 0
        this.tableRoundCount += 1
        if (this.modeConfig.crownEnabled) {
          this.updateCrownAtEndOfRound()
        }
      }
    }
  }

  resolvePendingInteraction(choice = {}) {
    if (this.pendingInteractions.length === 0) {
      throw new Error('No pending interaction to resolve')
    }

    const interaction = this.pendingInteractions[0]

    switch (interaction.type) {
      case 'architect': {
        const cardId = choice.cardId
        if (!interaction.choices.includes(cardId)) {
          throw new Error(`Invalid architect card choice: ${cardId}`)
        }
        break
      }
      case 'answer-42': {
        const cardId = choice.cardId
        if (!interaction.choices.includes(cardId)) {
          throw new Error(`Invalid answer-42 card choice: ${cardId}`)
        }
        break
      }
      case 'hand-overflow': {
        const discardId = choice.discardedCardId ?? choice.cardId
        if (!interaction.choices.includes(discardId)) {
          throw new Error(`Invalid card choice to discard: ${discardId}`)
        }
        break
      }
      case 'defensive-reaction': {
        if (choice.skip !== true) {
          const cardId = choice.cardId
          if (!interaction.availableCards.includes(cardId)) {
            throw new Error(`Invalid defensive card: ${cardId}`)
          }
        }
        break
      }
      case 'shop': {
        if (choice.skip !== true) {
          const costMap = { common: 1000, rare: 2000, legendary: 4000 }
          const cost = costMap[choice.rarity]
          if (!cost) {
            throw new Error(`Invalid shop rarity: ${choice.rarity}`)
          }
          const player = this.players[interaction.playerIndex]
          if (player.score < cost) {
            throw new Error('Not enough points for shop purchase')
          }
        }
        break
      }
    }

    const previousSnapshot = this.getSnapshot()
    this.pendingInteractions.shift()
    const actionEvents = []

    switch (interaction.type) {
      case 'architect': {
        const cardId = choice.cardId
        this.giveCardToPlayer(interaction.recipientPlayerIndex, cardId, actionEvents, 'architect')
        actionEvents.push({
          type: 'architect-resolved',
          architect: this.players[interaction.architectPlayerIndex].name,
          recipient: this.players[interaction.recipientPlayerIndex].name,
          cardId,
        })
        break
      }
      case 'answer-42': {
        const cardId = choice.cardId
        this.giveCardToPlayer(interaction.playerIndex, cardId, actionEvents, 'answer-42')
        actionEvents.push({
          type: 'answer-42-resolved',
          player: this.players[interaction.playerIndex].name,
          cardId,
        })
        break
      }
      case 'hand-overflow': {
        const discardId = choice.discardedCardId ?? choice.cardId
        const player = this.players[interaction.playerIndex]
        if (discardId === interaction.incomingCardId) {
          actionEvents.push({
            type: 'card-discarded',
            player: player.name,
            cardId: discardId,
          })
        } else {
          const idx = player.hand.indexOf(discardId)
          if (idx !== -1) {
            player.hand.splice(idx, 1)
          }
          player.hand.push(interaction.incomingCardId)
          actionEvents.push({
            type: 'card-discarded',
            player: player.name,
            cardId: discardId,
          })
        }
        break
      }
      case 'defensive-reaction': {
        const victim = this.players[interaction.victimIndex]
        if (choice.skip === true) {
          actionEvents.push({
            type: 'defensive-reaction-skipped',
            player: victim.name,
          })
        } else {
          const cardId = choice.cardId
          const cardIdx = victim.hand.indexOf(cardId)
          if (cardIdx !== -1) {
            victim.hand.splice(cardIdx, 1)
          }

          if (cardId === 'bouclier') {
            victim.checkpointHistory = [...interaction.checkpointHistoryBefore]
            victim.score = victim.checkpointHistory.at(-1) ?? 0
            victim.previousCheckpointScore = victim.checkpointHistory.at(-2) ?? 0
            actionEvents.push({
              type: 'shield-used',
              player: victim.name,
              restoredScore: victim.score,
              soundId: 'rarity-rare',
            })
          } else if (cardId === 'parachute') {
            victim.checkpointHistory = [...interaction.checkpointHistoryBefore]
            victim.score = victim.checkpointHistory.at(-1) ?? 0
            victim.previousCheckpointScore = victim.checkpointHistory.at(-2) ?? 0
            victim.dropHalfGap()
            actionEvents.push({
              type: 'parachute-used',
              player: victim.name,
              score: victim.score,
              soundId: 'rarity-rare',
            })
          } else if (cardId === 'miroir') {
            actionEvents.push({
              type: 'mirror-used',
              player: victim.name,
              soundId: 'mirror',
            })
            if (interaction.attackerIndex !== null && interaction.attackerIndex !== undefined) {
              const attacker = this.players[interaction.attackerIndex]
              const attackerFrom = attacker.score
              attacker.dropMultipleCheckpoints(1)
              const attackerTo = attacker.score
              if (attackerFrom !== attackerTo) {
                actionEvents.push({
                  type: 'downgrade',
                  player: attacker.name,
                  from: attackerFrom,
                  to: attackerTo,
                })
                this.handleConsolation(interaction.attackerIndex, actionEvents, 'collision')
                const attackerDefensive = attacker.hand.filter((id) =>
                  ['bouclier', 'parachute'].includes(id)
                )
                if (attackerDefensive.length > 0) {
                  this.pendingInteractions.push({
                    type: 'defensive-reaction',
                    victimIndex: interaction.attackerIndex,
                    attackerIndex: null,
                    from: attackerFrom,
                    to: attackerTo,
                    checkpointHistoryBefore: [attackerTo],
                    availableCards: attackerDefensive,
                  })
                }
              }
            }
          }
        }
        break
      }
      case 'shop': {
        const player = this.players[interaction.playerIndex]
        if (choice.skip === true) {
          actionEvents.push({
            type: 'shop-skipped',
            player: player.name,
          })
        } else {
          const costMap = { common: 1000, rare: 2000, legendary: 4000 }
          const cost = costMap[choice.rarity]
          player.adjustScore(-cost)
          const card = this.drawModeCardByRarity(choice.rarity)
          if (card) {
            this.giveCardToPlayer(interaction.playerIndex, card.id, actionEvents, 'shop')
          }
          actionEvents.push({
            type: 'shop-purchased',
            player: player.name,
            rarity: choice.rarity,
            cardId: card?.id,
            cost,
            soundId: 'shop',
          })
        }
        break
      }
      default:
        throw new Error(`Unknown pending interaction type: ${interaction.type}`)
    }

    this.events.push(...actionEvents)
    this.undoStack.push({
      previousSnapshot,
      eventsAdded: actionEvents.length,
    })

    return actionEvents
  }

  resolveArchitectChoice(cardId) {
    return this.resolvePendingInteraction({ cardId })
  }

  resolveHandOverflow(discardedCardId) {
    return this.resolvePendingInteraction({ discardedCardId })
  }

  buyShopCard(rarity) {
    return this.resolvePendingInteraction({ rarity })
  }

  skipShop() {
    return this.resolvePendingInteraction({ skip: true })
  }

  undoLastEvent() {
    if (this.diceTurn && this.diceTurn.phase !== 'ready') {
      throw new Error('Un lancer est en cours : terminez le tour avant d’annuler le précédent.')
    }
    const lastAction = this.undoStack.pop()
    if (!lastAction) return null

    const restored = Game.fromSnapshot(lastAction.previousSnapshot)
    this.players = restored.players
    this.diceMode = restored.diceMode
    this.diceTurn = restored.diceTurn
    this.diceCarry = restored.diceCarry
    this.currentPlayerIndex = restored.currentPlayerIndex
    this.winner = restored.winner
    this.events = restored.events
    this.crossedGlobalTiers = restored.crossedGlobalTiers
    this.crownHolderIndex = restored.crownHolderIndex
    this.crownBountyAvailable = restored.crownBountyAvailable
    this.activeTableEvent = restored.activeTableEvent
    this.turnDirection = restored.turnDirection
    this.turnsPlayedInRound = restored.turnsPlayedInRound
    this.tableRoundCount = restored.tableRoundCount
    this.firstBloodAwarded = restored.firstBloodAwarded
    this.coupDeclatAwarded = restored.coupDeclatAwarded
    this.lastPlayedCardId = restored.lastPlayedCardId
    this.lastTurnWasBust = restored.lastTurnWasBust
    this.activeTurnModifiers = restored.activeTurnModifiers
    this.activeBets = restored.activeBets
    this.activeDuels = restored.activeDuels
    this.activeTaxCollector = restored.activeTaxCollector
    this.bombState = restored.bombState
    this.pendingInteractions = restored.pendingInteractions
    this.discoveredIds = restored.discoveredIds
    this.welcomeCardGivenTo = restored.welcomeCardGivenTo

    return this.getSnapshot()
  }

  getSnapshot() {
    const winnerIndex = this.winner ? this.players.indexOf(this.winner) : null

    return {
      targetScore: this.targetScore,
      openingScore: this.openingScore,
      mode: this.mode,
      diceMode: this.diceMode,
      diceTurn: this.diceTurn ? structuredClone(this.diceTurn) : null,
      diceCarry: this.diceCarry ? this.diceCarry.map((faces) => [...faces]) : null,
      redZoneEnabled: this.modeConfig.redZoneEnabled,
      redZoneThreshold: this.modeConfig.redZoneThreshold,
      shopEnabled: this.modeConfig.shopEnabled,
      handLimit: this.modeConfig.handLimit,
      currentPlayerIndex: this.currentPlayerIndex,
      players: this.players.map((player) => player.toSnapshot()),
      winnerIndex,
      events: this.events.map((event) => ({ ...event })),
      crossedGlobalTiers: [...this.crossedGlobalTiers],
      crownHolderIndex: this.crownHolderIndex,
      crownBountyAvailable: this.crownBountyAvailable,
      activeTableEvent: this.activeTableEvent ? { ...this.activeTableEvent } : null,
      turnDirection: this.turnDirection,
      turnsPlayedInRound: this.turnsPlayedInRound,
      tableRoundCount: this.tableRoundCount,
      firstBloodAwarded: this.firstBloodAwarded,
      coupDeclatAwarded: this.coupDeclatAwarded,
      lastPlayedCardId: this.lastPlayedCardId,
      lastTurnWasBust: this.lastTurnWasBust,
      welcomeCardGivenTo: [...this.welcomeCardGivenTo],
      activeTurnModifiers: {
        ...this.activeTurnModifiers,
        declarativeCards: [...this.activeTurnModifiers.declarativeCards],
      },
      activeBets: this.activeBets.map((b) => ({ ...b })),
      activeDuels: this.activeDuels.map((d) => ({ ...d })),
      activeTaxCollector: this.activeTaxCollector ? { ...this.activeTaxCollector } : null,
      bombState: this.bombState ? { ...this.bombState } : null,
      pendingInteractions: this.pendingInteractions.map((pi) => ({
        ...pi,
        choices: pi.choices ? [...pi.choices] : undefined,
        availableCards: pi.availableCards ? [...pi.availableCards] : undefined,
        checkpointHistoryBefore: pi.checkpointHistoryBefore
          ? [...pi.checkpointHistoryBefore]
          : undefined,
      })),
      pendingInteraction: this.pendingInteractions[0] ?? null,
      discoveredIds: [...this.discoveredIds],
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
      mode: snapshot.mode,
      targetScore: snapshot.targetScore,
      openingScore: snapshot.openingScore,
      redZoneEnabled: snapshot.redZoneEnabled,
      shopEnabled: snapshot.shopEnabled,
    })

    if (snapshot.diceMode === 'virtual') {
      game.setDiceMode('virtual')
      game.diceTurn = restoreDiceTurn(snapshot.diceTurn)
      if (snapshot.diceCarry) game.diceCarry = newDiceTurn(snapshot.diceCarry).inheritedRolls
    }
    game.currentPlayerIndex = snapshot.currentPlayerIndex

    for (const [index, playerSnapshot] of snapshot.players.entries()) {
      game.players[index] = PlayerState.fromSnapshot(playerSnapshot)
    }

    game.winner = snapshot.winnerIndex === null ? null : game.players[snapshot.winnerIndex]
    game.events = Array.isArray(snapshot.events)
      ? snapshot.events.map((event) => ({ ...event }))
      : []

    game.crossedGlobalTiers = Array.isArray(snapshot.crossedGlobalTiers)
      ? [...snapshot.crossedGlobalTiers]
      : []
    game.crownHolderIndex = snapshot.crownHolderIndex ?? null
    game.crownBountyAvailable = Boolean(snapshot.crownBountyAvailable)
    game.activeTableEvent = snapshot.activeTableEvent ? { ...snapshot.activeTableEvent } : null
    game.turnDirection = snapshot.turnDirection ?? 1
    game.turnsPlayedInRound = snapshot.turnsPlayedInRound ?? 0
    game.tableRoundCount = snapshot.tableRoundCount ?? 0
    game.firstBloodAwarded = Boolean(snapshot.firstBloodAwarded)
    game.coupDeclatAwarded = Boolean(snapshot.coupDeclatAwarded)
    game.lastPlayedCardId = snapshot.lastPlayedCardId ?? null
    game.lastTurnWasBust = Boolean(snapshot.lastTurnWasBust)
    game.activeTurnModifiers = snapshot.activeTurnModifiers
      ? {
          ...snapshot.activeTurnModifiers,
          declarativeCards: Array.isArray(snapshot.activeTurnModifiers.declarativeCards)
            ? [...snapshot.activeTurnModifiers.declarativeCards]
            : [],
        }
      : game.createDefaultTurnModifiers()
    game.activeBets = Array.isArray(snapshot.activeBets)
      ? snapshot.activeBets.map((b) => ({ ...b }))
      : []
    game.activeDuels = Array.isArray(snapshot.activeDuels)
      ? snapshot.activeDuels.map((d) => ({ ...d }))
      : []
    game.activeTaxCollector = snapshot.activeTaxCollector
      ? { ...snapshot.activeTaxCollector }
      : null
    game.bombState = snapshot.bombState ? { ...snapshot.bombState } : null
    game.pendingInteractions = Array.isArray(snapshot.pendingInteractions)
      ? snapshot.pendingInteractions.map((pi) => ({
          ...pi,
          choices: pi.choices ? [...pi.choices] : undefined,
          availableCards: pi.availableCards ? [...pi.availableCards] : undefined,
          checkpointHistoryBefore: pi.checkpointHistoryBefore
            ? [...pi.checkpointHistoryBefore]
            : undefined,
        }))
      : snapshot.pendingInteraction
        ? [{ ...snapshot.pendingInteraction }]
        : []
    game.discoveredIds = Array.isArray(snapshot.discoveredIds) ? [...snapshot.discoveredIds] : []
    game.welcomeCardGivenTo = Array.isArray(snapshot.welcomeCardGivenTo)
      ? [...snapshot.welcomeCardGivenTo]
      : []

    return game
  }
}
