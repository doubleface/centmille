import { describe, expect, it } from 'vitest'
import { Game } from './Game.js'

describe('Game', () => {
  it('rejects invalid constructor and options', () => {
    expect(() => new Game(['Alice'])).toThrow('Game requires at least 2 players')
    expect(() => new Game(['Alice', ''])).toThrow('Player names must be non-empty strings')
    expect(() => new Game(['Alice', 'Bob'], { targetScore: 0 })).toThrow(
      'targetScore must be a positive integer'
    )
    expect(() => new Game(['Alice', 'Bob'], { openingScore: -1 })).toThrow(
      'openingScore must be a non-negative integer'
    )
  })

  it('forbids opening below openingScore', () => {
    const game = new Game(['Alice', 'Bob'])

    expect(() => game.recordTurn(400)).toThrow('Cannot open below 500 points')
  })

  it('marks winner on exact target score', () => {
    const game = new Game(['Alice', 'Bob'])
    const alice = game.players[0]

    alice.hasOpened = true
    alice.score = 9800
    alice.checkpointHistory = [0, 9800]
    alice.previousCheckpointScore = 0

    const events = game.recordTurn(200)

    expect(events[0]).toEqual({
      type: 'score',
      player: 'Alice',
      turnScore: 200,
      cumulative: 10000,
    })
    expect(game.winner?.name).toBe('Alice')
  })

  it('rejects overshoot', () => {
    const game = new Game(['Alice', 'Bob'])
    const alice = game.players[0]

    alice.hasOpened = true
    alice.score = 9900
    alice.checkpointHistory = [0, 9900]

    expect(() => game.recordTurn(200)).toThrow('Cannot overshoot 10000 points')
  })

  it('applies simple collision downgrade', () => {
    const game = new Game(['Alice', 'Bob'])

    game.recordTurn(500)
    game.recordTurn(500)
    const events = game.recordTurn(500)

    expect(events).toContainEqual({
      type: 'downgrade',
      player: 'Bob',
      from: 500,
      to: 0,
    })
    expect(game.players[1].score).toBe(0)
  })

  it('applies chained collisions', () => {
    const game = new Game(['Alice', 'Bob', 'Charlie'])
    const [alice, bob, charlie] = game.players

    alice.hasOpened = true
    bob.hasOpened = true
    charlie.hasOpened = true

    alice.checkpointHistory = [0, 500, 900]
    alice.score = 900
    alice.previousCheckpointScore = 500

    bob.checkpointHistory = [0, 700, 1200]
    bob.score = 1200
    bob.previousCheckpointScore = 700

    charlie.checkpointHistory = [0, 500, 700]
    charlie.score = 700
    charlie.previousCheckpointScore = 500

    const events = game.recordTurn(300)

    expect(events).toContainEqual({
      type: 'downgrade',
      player: 'Bob',
      from: 1200,
      to: 700,
    })
    expect(events).toContainEqual({
      type: 'downgrade',
      player: 'Charlie',
      from: 700,
      to: 500,
    })
  })

  it('drops to checkpoint after 3 busts', () => {
    const game = new Game(['Alice', 'Bob'])
    const alice = game.players[0]

    alice.hasOpened = true
    alice.checkpointHistory = [0, 500, 1200]
    alice.score = 1200
    alice.previousCheckpointScore = 500

    game.recordBust()
    game.currentPlayerIndex = 0
    game.recordBust()
    game.currentPlayerIndex = 0
    const events = game.recordBust()

    expect(events).toContainEqual({
      type: 'downgrade',
      player: 'Alice',
      from: 1200,
      to: 500,
    })
    expect(alice.score).toBe(500)
    expect(alice.failedTurnsInRow).toBe(0)
  })

  it('undoes last action from snapshot', () => {
    const game = new Game(['Alice', 'Bob'])

    game.recordTurn(500)
    const beforeBust = game.getSnapshot()
    game.recordBust()

    const restored = game.undoLastEvent()

    expect(restored).toEqual(beforeBust)
    expect(game.getSnapshot()).toEqual(beforeBust)
  })

  it('returns null when undo stack is empty', () => {
    const game = new Game(['Alice', 'Bob'])

    expect(game.undoLastEvent()).toBeNull()
  })

  it('rejects invalid turn score values', () => {
    const game = new Game(['Alice', 'Bob'])

    expect(() => game.recordTurn(0)).toThrow('turnScore must be a positive integer')
    expect(() => game.recordTurn(150)).toThrow('Cannot stop on a non-multiple of 100')
  })

  it('rejects actions once a winner exists', () => {
    const game = new Game(['Alice', 'Bob'])
    game.players[0].hasOpened = true
    game.players[0].score = 9900
    game.players[0].checkpointHistory = [0, 9900]

    game.recordTurn(100)

    expect(() => game.recordTurn(100)).toThrow('Game is already over')
    expect(() => game.recordBust()).toThrow('Game is already over')
  })

  it('serializes and restores state from snapshot', () => {
    const game = new Game(['Alice', 'Bob'])
    game.recordTurn(500)

    const snapshot = game.getSnapshot()
    const restored = Game.fromSnapshot(snapshot)

    expect(restored.getSnapshot()).toEqual(snapshot)
  })

  it('rejects invalid snapshot input', () => {
    expect(() => Game.fromSnapshot(null)).toThrow('Snapshot must be an object')
    expect(() => Game.fromSnapshot({ players: [] })).toThrow(
      'Snapshot must contain at least 2 players'
    )
  })

  it('supports snapshot fallback fields', () => {
    const snapshot = {
      targetScore: 10000,
      openingScore: 500,
      currentPlayerIndex: 0,
      players: [
        {
          name: 'Alice',
          score: 500,
          previousCheckpointScore: 0,
          hasOpened: true,
          failedTurnsInRow: 0,
        },
        {
          name: 'Bob',
          score: 0,
          previousCheckpointScore: 0,
          checkpointHistory: [0],
          hasOpened: false,
          failedTurnsInRow: 0,
        },
      ],
      winnerIndex: null,
    }

    const restored = Game.fromSnapshot(snapshot)
    expect(restored.players[0].checkpointHistory).toEqual([0, 500])
    expect(restored.events).toEqual([])
  })

  describe('Cent Mille mode initialization', () => {
    it('initializes with Cent Mille defaults', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      expect(game.mode).toBe('cent-mille')
      expect(game.targetScore).toBe(100000)
      expect(game.openingScore).toBe(500)
      expect(game.modeConfig.jokersEnabled).toBe(true)
      expect(game.modeConfig.magicNumbersEnabled).toBe(true)
      expect(game.modeConfig.achievementsEnabled).toBe(true)
      expect(game.modeConfig.tableEventsEnabled).toBe(true)
      expect(game.modeConfig.redZoneEnabled).toBe(true)
      expect(game.modeConfig.shopEnabled).toBe(true)
      expect(game.crossedGlobalTiers).toEqual([])
      expect(game.crownHolderIndex).toBeNull()
      expect(game.crownBountyAvailable).toBe(false)
      expect(game.activeTurnModifiers.arrondi).toBe(false)
      expect(game.pendingInteractions).toEqual([])
    })

    it('allows custom targetScore, openingScore, and feature flags in Cent Mille', () => {
      const game = new Game(['Alice', 'Bob'], {
        mode: 'cent-mille',
        targetScore: 80000,
        openingScore: 1000,
        redZoneEnabled: false,
        shopEnabled: false,
      })
      expect(game.targetScore).toBe(80000)
      expect(game.openingScore).toBe(1000)
      expect(game.modeConfig.redZoneEnabled).toBe(false)
      expect(game.modeConfig.shopEnabled).toBe(false)
    })
  })

  describe('Discovery and card distribution', () => {
    it('marks discovery once and returns true then false', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      expect(game.markDiscovered('card:bouclier')).toBe(true)
      expect(game.markDiscovered('card:bouclier')).toBe(false)
      expect(game.discoveredIds).toContain('card:bouclier')
    })

    it('gives card to player and handles hand overflow (> 3 cards)', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      const alice = game.players[0]

      game.giveCardToPlayer(0, 'bouclier')
      expect(alice.hand).toEqual(['bouclier'])

      game.giveCardToPlayer(0, 'doubleur')
      game.giveCardToPlayer(0, 'arrondi')
      expect(alice.hand).toHaveLength(3)
      expect(game.pendingInteractions).toHaveLength(0)

      game.giveCardToPlayer(0, 'gel')
      expect(alice.hand).toHaveLength(3)
      expect(game.pendingInteractions).toHaveLength(1)
      expect(game.pendingInteractions[0]).toEqual({
        type: 'hand-overflow',
        playerIndex: 0,
        player: 'Alice',
        incomingCardId: 'gel',
        choices: ['bouclier', 'doubleur', 'arrondi', 'gel'],
      })
    })

    it('safely ignores invalid card or invalid player index in giveCardToPlayer', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      game.giveCardToPlayer(0, 'unknown-card-xyz')
      expect(game.players[0].hand).toEqual([])
      game.giveCardToPlayer(99, 'bouclier')
    })
  })

  describe('playCard pre-checks and restrictions', () => {
    it('rejects playCard if game is already won or jokers disabled', () => {
      const quickGame = new Game(['Alice', 'Bob'])
      quickGame.players[0].hand.push('bouclier')
      expect(() => quickGame.playCard('bouclier')).toThrow('Jokers are not enabled in this mode')

      const centGame = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      centGame.winner = centGame.players[0]
      expect(() => centGame.playCard('bouclier')).toThrow('Game is already over')
    })

    it('rejects playCard if card is not in player hand or unknown', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      expect(() => game.playCard('bouclier')).toThrow('Card is not in player hand')

      game.players[0].hand.push('fake-card')
      expect(() => game.playCard('fake-card')).toThrow('Unknown card: fake-card')
    })

    it('blocks offensive card in Red Zone (score >= 90000)', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      const alice = game.players[0]
      alice.score = 91000
      alice.hand.push('gel', 'bouclier')

      expect(() => game.playCard('gel', { targetIndex: 1 })).toThrow(
        'Cannot play offensive card in Red Zone'
      )
      // Non-offensive cards are allowed
      expect(() => game.playCard('bouclier')).not.toThrow()
    })

    it('validates card-specific preconditions', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      const alice = game.players[0]

      // aspirateur requires lastTurnWasBust
      alice.hand.push('aspirateur')
      expect(() => game.playCard('aspirateur')).toThrow('Previous turn was not a bust')

      // contrat requires valid targetScore
      alice.hand.push('contrat')
      expect(() => game.playCard('contrat', { targetScore: 250 })).toThrow(
        'Contrat requires targetScore >= 300 and multiple of 100'
      )
      expect(() => game.playCard('contrat', { targetScore: 'invalid' })).toThrow(
        'Contrat requires targetScore >= 300 and multiple of 100'
      )

      // echo requires lastPlayedCardId
      alice.hand.push('echo')
      expect(() => game.playCard('echo')).toThrow('No previous card to echo')

      // instant-target requires valid targetIndex
      alice.hand.push('gel')
      expect(() => game.playCard('gel', { targetIndex: 0 })).toThrow('Invalid target player')
      expect(() => game.playCard('gel', { targetIndex: 5 })).toThrow('Invalid target player')

      // pickpocket requires opponent with >= 1000 pts
      alice.hand.push('pickpocket')
      expect(() => game.playCard('pickpocket')).toThrow('No opponent with at least 1000 points')

      // teleporteur requires opponent strictly ahead with gap <= 3000
      alice.hand.push('teleporteur')
      expect(() => game.playCard('teleporteur')).toThrow('No player ahead within 3000 points')
    })
  })

  describe('Card effects execution', () => {
    it('executes pre-turn modifiers and declarative cards', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      const alice = game.players[0]
      alice.hand.push('arrondi', 'doubleur', 'sniper', 'assurance', 'tout-ou-rien', 'contrat')

      game.playCard('arrondi')
      expect(game.activeTurnModifiers.arrondi).toBe(true)

      game.playCard('doubleur')
      expect(game.activeTurnModifiers.doubleur).toBe(true)

      game.playCard('sniper')
      expect(game.activeTurnModifiers.sniper).toBe(true)

      game.playCard('assurance')
      expect(game.activeTurnModifiers.assurance).toBe(true)

      game.playCard('tout-ou-rien')
      expect(game.activeTurnModifiers.toutOuRien).toBe(true)

      game.playCard('contrat', { targetScore: 800 })
      expect(game.activeTurnModifiers.contratTarget).toBe(800)

      game.lastTurnWasBust = true
      alice.hand.push('aspirateur', 'sixieme-sens', 'reset')
      game.playCard('aspirateur')
      game.playCard('sixieme-sens')
      game.playCard('reset')
      expect(game.activeTurnModifiers.declarativeCards).toEqual([
        'aspirateur',
        'sixieme-sens',
        'reset',
      ])
    })

    it('executes Boomerang reflection on offensive target cards', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      const [alice, bob] = game.players
      alice.hand.push('gel')
      bob.hand.push('boomerang')

      const events = game.playCard('gel', { targetIndex: 1 })
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'boomerang',
          player: 'Bob',
          attacker: 'Alice',
          cardId: 'gel',
        })
      )
      // Bob reflected the freeze onto Alice!
      expect(bob.status.frozen).toBe(false)
      expect(alice.status.frozen).toBe(true)
      expect(bob.hand).not.toContain('boomerang')
    })

    it('executes instant-target cards: gel, malediction, parieur, bombe, duel, troc', () => {
      const game = new Game(['Alice', 'Bob'], {
        mode: 'cent-mille',
        rng: () => 0, // deterministic card swap
      })
      const [alice, bob] = game.players
      alice.hand.push('gel', 'malediction', 'parieur', 'bombe', 'duel', 'troc', 'bouclier')
      bob.hand.push('doubleur')

      game.playCard('gel', { targetIndex: 1 })
      expect(bob.status.frozen).toBe(true)

      game.playCard('malediction', { targetIndex: 1 })
      expect(bob.status.cursed).toBe(true)

      game.playCard('parieur', { targetIndex: 1 })
      expect(game.activeBets).toEqual([{ betterIndex: 0, targetIndex: 1 }])

      game.playCard('bombe', { targetIndex: 1 })
      expect(game.bombState).toEqual({ holderIndex: 1, remainingTableRounds: 3 })

      game.playCard('duel', { targetIndex: 1 })
      expect(game.activeDuels).toEqual([
        { challengerIndex: 0, targetIndex: 1, challengerScore: null, targetScore: null },
      ])

      game.playCard('troc', { targetIndex: 1 })
      expect(alice.hand).toContain('doubleur')
      expect(bob.hand).toContain('bouclier')
    })

    it('executes instant-self cards: percepteur, pickpocket, teleporteur, vampire, effaceur, fantome, bis', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      const [alice, bob] = game.players

      alice.hand.push('percepteur', 'vampire', 'effaceur', 'fantome', 'bis')
      alice.failedTurnsInRow = 2

      game.playCard('percepteur')
      expect(game.activeTaxCollector).toEqual({ collectorIndex: 0, remainingTurns: 2 })

      game.playCard('vampire')
      expect(alice.status.vampire).toBe(true)

      game.playCard('effaceur')
      expect(alice.failedTurnsInRow).toBe(0)

      game.playCard('fantome')
      expect(alice.status.ghost).toBe(true)

      game.playCard('bis')
      expect(alice.status.extraTurn).toBe(true)

      // Pickpocket
      bob.score = 2500
      alice.hand.push('pickpocket')
      game.playCard('pickpocket')
      expect(bob.score).toBe(1500)
      expect(alice.score).toBe(1000)

      // Teleporteur
      bob.score = 2000
      alice.score = 500
      alice.hand.push('teleporteur')
      game.playCard('teleporteur')
      expect(alice.score).toBe(2000)
      expect(bob.score).toBe(500)
    })

    it('executes pandore with rng branches', () => {
      let rngValue = 0.2 // legend card branch
      const game = new Game(['Alice', 'Bob'], {
        mode: 'cent-mille',
        rng: () => rngValue,
      })
      const alice = game.players[0]
      alice.hand.push('pandore')

      game.playCard('pandore')
      expect(alice.hand).toHaveLength(1) // got a legendary card

      // cursed branch
      rngValue = 0.8
      alice.hand.push('pandore')
      game.playCard('pandore')
      expect(alice.status.cursed).toBe(true)
    })

    it('executes gages: main-faible (accepted and refused), aveugle, annonceur', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      const [alice, bob] = game.players
      bob.score = 1000
      alice.hand.push('main-faible', 'main-faible', 'aveugle', 'annonceur')

      const ev1 = game.playCard('main-faible', { targetIndex: 1 })
      expect(ev1).toContainEqual(expect.objectContaining({ type: 'gage', player: 'Bob' }))

      const ev2 = game.playCard('main-faible', { targetIndex: 1, refuseGage: true })
      expect(ev2).toContainEqual(
        expect.objectContaining({ type: 'gage-refused', player: 'Bob', penalty: 500 })
      )
      expect(bob.score).toBe(500)

      const ev3 = game.playCard('aveugle', { targetIndex: 1 })
      expect(ev3).toContainEqual(expect.objectContaining({ type: 'gage', cardId: 'aveugle' }))

      const ev4 = game.playCard('annonceur', { targetIndex: 1 })
      expect(ev4).toContainEqual(expect.objectContaining({ type: 'gage', cardId: 'annonceur' }))
    })

    it('executes echo to repeat the last played card', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      const [alice, bob] = game.players
      alice.hand.push('arrondi')
      game.playCard('arrondi')
      expect(game.lastPlayedCardId).toBe('arrondi')

      game.advanceTurn() // now Bob's turn
      bob.hand.push('echo')
      game.playCard('echo')
      expect(game.activeTurnModifiers.arrondi).toBe(true)
      expect(game.lastPlayedCardId).toBe('arrondi') // echo does not overwrite lastPlayedCardId
    })
  })

  describe('recordTurn in Cent Mille mode', () => {
    it('handles Contrat card success and failure (bust)', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      const alice = game.players[0]
      alice.hand.push('contrat')

      game.playCard('contrat', { targetScore: 600 })
      // Failure to hit contract causes bust
      const bustEvents = game.recordTurn(500)
      expect(bustEvents).toContainEqual(expect.objectContaining({ type: 'bust', player: 'Alice' }))

      // Next player (Bob)
      game.currentPlayerIndex = 0
      alice.hand.push('contrat')
      game.playCard('contrat', { targetScore: 600 })
      const successEvents = game.recordTurn(600)
      // Contract doubled score to 1200
      expect(successEvents).toContainEqual(
        expect.objectContaining({ type: 'score', player: 'Alice', turnScore: 1200 })
      )
    })

    it('handles Tout ou Rien card success (x3) and failure (extra bust penalty)', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      const alice = game.players[0]

      // Fail condition (< 1000 pts)
      alice.hand.push('tout-ou-rien')
      game.playCard('tout-ou-rien')
      game.recordTurn(800)
      expect(alice.failedTurnsInRow).toBe(2) // 1 failure + 1 extra penalty

      // Success condition (>= 1000 pts)
      game.currentPlayerIndex = 0
      alice.hand.push('tout-ou-rien')
      game.playCard('tout-ou-rien')
      const events = game.recordTurn(1000)
      // 1000 * 3 = 3000
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'score', turnScore: 3000, cumulative: 3000 })
      )
    })

    it('handles Cursed status (< 500 triggers bust, >= 500 clears curse)', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      const alice = game.players[0]
      alice.status.cursed = true

      // Turn under 500 triggers bust
      const events = game.recordTurn(400)
      expect(events).toContainEqual(expect.objectContaining({ type: 'bust', player: 'Alice' }))
      expect(alice.status.cursed).toBe(false)

      game.currentPlayerIndex = 0
      alice.status.cursed = true
      const successEvents = game.recordTurn(600)
      expect(successEvents).toContainEqual(expect.objectContaining({ type: 'score' }))
      expect(alice.status.cursed).toBe(false)
    })

    it('handles Arrondi card allowing non-multiple of 100 and rounding up', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      const alice = game.players[0]
      alice.hand.push('arrondi')
      game.playCard('arrondi')

      const events = game.recordTurn(550)
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'score', turnScore: 600, cumulative: 600 })
      )
    })

    it('handles Doubleur card multiplying score by 2', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      const alice = game.players[0]
      alice.hand.push('doubleur')
      game.playCard('doubleur')

      const events = game.recordTurn(600)
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'score', turnScore: 1200, cumulative: 1200 })
      )
    })

    it('collects tax for active Tax Collector on turns >= 1000', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      const [alice, bob] = game.players
      alice.hand.push('percepteur')
      game.playCard('percepteur') // Alice is tax collector

      game.currentPlayerIndex = 1 // Bob's turn
      const events = game.recordTurn(1200)
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'tax-paid',
          from: 'Bob',
          to: 'Alice',
          amount: 200,
        })
      )
      expect(bob.score).toBe(1000)
      expect(alice.score).toBe(200)
    })

    it('passes the bomb to bombTargetIndex when turn score >= 1000', () => {
      const game = new Game(['Alice', 'Bob', 'Charlie'], { mode: 'cent-mille' })
      game.bombState = { holderIndex: 0, remainingTableRounds: 3 }

      const events = game.recordTurn(1000, { bombTargetIndex: 2 })
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'bomb-passed',
          from: 'Alice',
          to: 'Charlie',
        })
      )
      expect(game.bombState.holderIndex).toBe(2)
    })

    it('resolves active duels when both players play', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      game.activeDuels = [
        { challengerIndex: 0, targetIndex: 1, challengerScore: null, targetScore: null },
      ]

      // Alice plays 1000
      game.recordTurn(1000)
      expect(game.activeDuels[0].challengerScore).toBe(1000)

      // Bob plays 500 -> Alice wins duel (+1000 to Alice, -1000 to Bob)
      const events = game.recordTurn(500)
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'duel-resolved',
          winner: 'Alice',
          loser: 'Bob',
        })
      )
      expect(game.activeDuels).toHaveLength(0)
      expect(game.players[0].score).toBe(2000) // 1000 + 1000
      expect(game.players[1].score).toBe(0) // 500 - 1000 clamped to 0
    })

    it('resolves active bets: cleared on valid turn without bust', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      game.activeBets = [{ betterIndex: 0, targetIndex: 1 }]

      game.currentPlayerIndex = 1
      game.recordTurn(500)
      expect(game.activeBets).toHaveLength(0)
    })

    it('triggers magic numbers: lucky-repdigit, ascending, exact-tier, devil, answer-42, black-cat, jackpot', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      const alice = game.players[0]

      // 1. lucky-repdigit (11100)
      alice.score = 10600
      alice.checkpointHistory = [0, 10600]
      alice.hasOpened = true
      let ev = game.recordTurn(500)
      expect(ev).toContainEqual(
        expect.objectContaining({ type: 'magic-number', magicId: 'lucky-repdigit' })
      )
      expect(alice.hand.length).toBeGreaterThan(0)

      // 2. ascending (12300) -> +1000 pts
      game.currentPlayerIndex = 0
      alice.score = 11700
      alice.checkpointHistory = [0, 11700]
      ev = game.recordTurn(600)
      expect(ev).toContainEqual(
        expect.objectContaining({ type: 'magic-number', magicId: 'ascending' })
      )
      expect(alice.score).toBe(13300) // 12300 + 1000

      // 3. exact-tier (20000) -> bouclier
      game.currentPlayerIndex = 0
      alice.score = 19500
      alice.checkpointHistory = [0, 19500]
      ev = game.recordTurn(500)
      expect(ev).toContainEqual(
        expect.objectContaining({ type: 'magic-number', magicId: 'exact-tier' })
      )
      expect(alice.hand).toContain('bouclier')

      // 4. devil (66600) -> drops 1 checkpoint
      game.currentPlayerIndex = 0
      alice.score = 66100
      alice.checkpointHistory = [0, 60000]
      ev = game.recordTurn(500)
      expect(ev).toContainEqual(expect.objectContaining({ type: 'magic-number', magicId: 'devil' }))
      expect(alice.score).toBe(60000)

      // 5. answer-42 (42000) -> pending interaction
      game.currentPlayerIndex = 0
      alice.score = 41500
      alice.checkpointHistory = [0, 41500]
      ev = game.recordTurn(500)
      expect(ev).toContainEqual(
        expect.objectContaining({ type: 'magic-number', magicId: 'answer-42' })
      )
      expect(game.pendingInteractions).toContainEqual(
        expect.objectContaining({ type: 'answer-42', playerIndex: 0 })
      )

      // 6. black-cat (13000) -> cursed
      game.currentPlayerIndex = 0
      alice.score = 12500
      alice.checkpointHistory = [0, 12500]
      ev = game.recordTurn(500)
      expect(ev).toContainEqual(
        expect.objectContaining({ type: 'magic-number', magicId: 'black-cat' })
      )
      expect(alice.status.cursed).toBe(true)

      // 7. jackpot (77700) -> legendary card
      game.currentPlayerIndex = 0
      alice.score = 77200
      alice.checkpointHistory = [0, 77200]
      alice.hand = []
      ev = game.recordTurn(500)
      expect(ev).toContainEqual(
        expect.objectContaining({ type: 'magic-number', magicId: 'jackpot' })
      )
      expect(alice.hand).toHaveLength(1)
    })

    it('limits exact-tier to once per tier per player and supports expanded magic tiers', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      const [alice, bob] = game.players

      // Alice reaches 20 000 for the first time
      alice.score = 19500
      alice.checkpointHistory = [0, 19500]
      alice.hasOpened = true

      let ev = game.recordTurn(500)
      expect(ev).toContainEqual(
        expect.objectContaining({ type: 'magic-number', magicId: 'exact-tier' })
      )
      expect(alice.exactTiersClaimed).toEqual([20000])
      expect(alice.hand).toContain('bouclier')
      alice.hand = []

      // Alice drops and reaches 20 000 again -> should NOT trigger exact-tier
      alice.adjustScore(-500)
      expect(alice.score).toBe(19500)
      game.currentPlayerIndex = 0
      ev = game.recordTurn(500)
      expect(ev.some((e) => e.type === 'magic-number' && e.magicId === 'exact-tier')).toBe(false)
      expect(alice.hand).toEqual([])
      expect(alice.exactTiersClaimed).toEqual([20000])

      // Alice reaches 40 000 -> triggers exact-tier for tier 40000
      alice.score = 39500
      alice.checkpointHistory = [0, 19500, 39500]
      game.currentPlayerIndex = 0
      ev = game.recordTurn(500)
      expect(ev).toContainEqual(
        expect.objectContaining({ type: 'magic-number', magicId: 'exact-tier' })
      )
      expect(alice.exactTiersClaimed).toEqual([20000, 40000])

      // Bob reaches 20 000 -> triggers exact-tier for Bob
      bob.score = 19500
      bob.checkpointHistory = [0, 19500]
      bob.hasOpened = true
      game.currentPlayerIndex = 1
      ev = game.recordTurn(500)
      expect(ev).toContainEqual(
        expect.objectContaining({ type: 'magic-number', magicId: 'exact-tier' })
      )
      expect(bob.exactTiersClaimed).toEqual([20000])

      // Expanded answer-42 tier (e.g. 24000)
      alice.score = 23500
      alice.checkpointHistory = [0, 23500]
      game.currentPlayerIndex = 0
      ev = game.recordTurn(500)
      expect(ev).toContainEqual(
        expect.objectContaining({ type: 'magic-number', magicId: 'answer-42' })
      )

      // Expanded black-cat tier (e.g. 31300)
      alice.status.cursed = false
      alice.score = 30800
      alice.checkpointHistory = [0, 30800]
      game.currentPlayerIndex = 0
      ev = game.recordTurn(500)
      expect(ev).toContainEqual(
        expect.objectContaining({ type: 'magic-number', magicId: 'black-cat' })
      )
      expect(alice.status.cursed).toBe(true)
    })

    it('triggers collisions, vampire drain, Crown Bounty, Consolation and defensive reaction', () => {
      const game = new Game(['Alice', 'Bob'], {
        mode: 'cent-mille',
        rng: () => 0.1, // guarantees consolation card
      })
      const [alice, bob] = game.players

      alice.hasOpened = true
      bob.hasOpened = true
      bob.score = 1000
      bob.checkpointHistory = [0, 500, 1000]
      bob.previousCheckpointScore = 500
      bob.hand.push('bouclier') // defensive reaction trigger

      alice.status.vampire = true
      alice.score = 500
      alice.checkpointHistory = [0, 500]

      game.crownHolderIndex = 1 // Bob has crown
      game.crownBountyAvailable = true

      const events = game.recordTurn(500) // Alice lands on 1000 -> collision with Bob!
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'downgrade', player: 'Bob', from: 1000, to: 500 })
      )
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'vampire-drain', player: 'Alice', amount: 500 })
      )
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'bounty-claimed', hunter: 'Alice', leader: 'Bob' })
      )
      expect(game.crownBountyAvailable).toBe(false)
      expect(events).toContainEqual(expect.objectContaining({ type: 'consolation', player: 'Bob' }))

      expect(game.pendingInteractions).toContainEqual(
        expect.objectContaining({
          type: 'defensive-reaction',
          victimIndex: 1,
          availableCards: ['bouclier'],
        })
      )
    })

    it('handles tier crossing: cards expiration, Architect choice, table event, shop interaction', () => {
      const game = new Game(['Alice', 'Bob'], {
        mode: 'cent-mille',
        rng: () => 0, // draws happy-hour (declarative table event, no extra card draws)
      })
      const [alice, bob] = game.players

      alice.hasOpened = true
      alice.hand.push('arrondi', 'doubleur')
      alice.status.ghost = true
      alice.status.vampire = true
      alice.score = 19500
      alice.checkpointHistory = [0, 19500]

      bob.hasOpened = true
      bob.score = 500

      const events = game.recordTurn(500) // Alice crosses 20 000
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'cards-expired',
          player: 'Alice',
          cards: ['arrondi', 'doubleur'],
        })
      )
      // Cards in hand before crossing expired, but exact-tier 20 000 granted bouclier
      expect(alice.hand).toEqual(['bouclier'])
      expect(alice.status.ghost).toBe(false)
      expect(alice.status.vampire).toBe(false)
      expect(alice.highestTierReached).toBe(20000)
      expect(events).toContainEqual(expect.objectContaining({ type: 'tier-crossed', tier: 20000 }))

      // Architect interaction for last player (Bob)
      expect(game.pendingInteractions).toContainEqual(
        expect.objectContaining({
          type: 'architect',
          tier: 20000,
          architectPlayerIndex: 0,
          recipientPlayerIndex: 1,
        })
      )
      // Shop interaction
      expect(game.pendingInteractions).toContainEqual(
        expect.objectContaining({
          type: 'shop',
          playerIndex: 0,
          tier: 20000,
        })
      )
      // Table event was triggered
      expect(game.activeTableEvent).not.toBeNull()
    })

    it('triggers Red Zone on score >= 90000, distributing sabotage cards to opponents', () => {
      const game = new Game(['Alice', 'Bob', 'Charlie'], { mode: 'cent-mille' })
      const alice = game.players[0]
      alice.hasOpened = true
      alice.score = 89500
      alice.checkpointHistory = [0, 89500]
      alice.highestTierReached = 80000
      game.crossedGlobalTiers = [20000, 40000, 60000, 80000]

      const events = game.recordTurn(600) // reaches 90100
      expect(events).toContainEqual(expect.objectContaining({ type: 'red-zone', player: 'Alice' }))
      expect(game.players[1].hand).toHaveLength(1)
      expect(game.players[2].hand).toHaveLength(1)
    })

    it('unlocks achievements and grants bonus card', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      const [alice, bob] = game.players
      alice.hasOpened = true
      bob.hasOpened = true
      alice.score = 500
      alice.failedTurnsInRow = 2 // will trigger miracule

      const events = game.recordTurn(2000) // triggers coup-declat and miracule
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'achievement', achievementId: 'coup-declat' })
      )
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'achievement', achievementId: 'miracule' })
      )
      expect(alice.achievements).toContain('coup-declat')
      expect(alice.achievements).toContain('miracule')
      expect(alice.hand.length).toBeGreaterThanOrEqual(2)
      expect(game.coupDeclatAwarded).toBe(true)

      // Bob also scores >= 2000, but coup-declat is only awarded to the first player
      bob.score = 500
      const bobEvents = game.recordTurn(2000)
      expect(
        bobEvents.some((e) => e.type === 'achievement' && e.achievementId === 'coup-declat')
      ).toBe(false)
      expect(bob.achievements).not.toContain('coup-declat')
    })

    it('evaluates phenix: requires effectiveScore >= 2000 after a drop', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      const alice = game.players[0]
      alice.hasOpened = true
      alice.score = 1000
      alice.checkpointHistory = [0, 500, 1000]

      // Case 1: recovers but effectiveScore < 2000 -> no phenix
      alice.scoreBeforeLastDrop = 1500
      let events = game.recordTurn(600) // 1000 + 600 = 1600 >= 1500, but 600 < 2000
      expect(events.some((e) => e.type === 'achievement' && e.achievementId === 'phenix')).toBe(
        false
      )
      expect(alice.achievements).not.toContain('phenix')

      // Case 2: drops and recovers with effectiveScore >= 2000 -> unlocks phenix
      alice.score = 1000
      alice.checkpointHistory = [0, 1000]
      alice.scoreBeforeLastDrop = 2500
      game.currentPlayerIndex = 0
      events = game.recordTurn(2000) // 1000 + 2000 = 3000 >= 2500 and effectiveScore >= 2000
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'achievement', achievementId: 'phenix' })
      )
      expect(alice.achievements).toContain('phenix')
    })
  })

  describe('recordBust in Cent Mille mode', () => {
    it('uses Assurance card to save half points on accumulatedPoints >= 200', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      const alice = game.players[0]
      alice.hasOpened = true
      alice.score = 1000
      alice.checkpointHistory = [0, 1000]
      alice.hand.push('assurance')
      game.playCard('assurance')

      const events = game.recordBust({ accumulatedPoints: 500 })
      // Math.floor(500 / 200) * 100 = 200 validated!
      expect(events).toContainEqual(expect.objectContaining({ type: 'score', turnScore: 200 }))
      expect(alice.score).toBe(1200)
    })

    it('resolves active bets on bust and awards 1000 pts to better', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      const [alice] = game.players
      game.activeBets = [{ betterIndex: 0, targetIndex: 1 }] // Alice bet on Bob busting

      game.currentPlayerIndex = 1
      const events = game.recordBust()
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'bet-won',
          player: 'Alice',
          target: 'Bob',
          amount: 1000,
        })
      )
      expect(alice.score).toBe(1000)
      expect(game.activeBets).toHaveLength(0)
    })

    it('offers consolation and defensive reaction on 3rd failure checkpoint drop', () => {
      const game = new Game(['Alice', 'Bob'], {
        mode: 'cent-mille',
        rng: () => 0.1, // consolation guarantee
      })
      const alice = game.players[0]
      alice.hasOpened = true
      alice.score = 2000
      alice.checkpointHistory = [0, 1000, 2000]
      alice.previousCheckpointScore = 1000
      alice.failedTurnsInRow = 2
      alice.hand.push('bouclier')

      const events = game.recordBust()
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'downgrade', player: 'Alice', from: 2000, to: 1000 })
      )
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'consolation', player: 'Alice' })
      )
      expect(game.pendingInteractions).toContainEqual(
        expect.objectContaining({ type: 'defensive-reaction', victimIndex: 0 })
      )
    })
  })

  describe('advanceTurn in Cent Mille mode', () => {
    it('grants an extra turn without advancing when extraTurn status is active', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      game.players[0].status.extraTurn = true

      game.advanceTurn()
      expect(game.currentPlayerIndex).toBe(0)
      expect(game.players[0].status.extraTurn).toBe(false)
    })

    it('reverses turn direction when sens-inverse table event is active', () => {
      const game = new Game(['Alice', 'Bob', 'Charlie'], { mode: 'cent-mille' })
      game.activeTableEvent = {
        id: 'sens-inverse',
        name: '🔃 Sens inverse',
        remainingTurns: 3,
      }
      game.turnDirection = -1

      game.advanceTurn()
      expect(game.currentPlayerIndex).toBe(2) // goes backwards to Charlie
    })

    it('skips frozen player and clears frozen status', () => {
      const game = new Game(['Alice', 'Bob', 'Charlie'], { mode: 'cent-mille' })
      game.players[1].status.frozen = true // Bob is frozen

      game.advanceTurn()
      expect(game.currentPlayerIndex).toBe(2) // skipped Bob to Charlie
      expect(game.players[1].status.frozen).toBe(false)
      expect(game.events).toContainEqual(
        expect.objectContaining({ type: 'turn-skipped-frozen', player: 'Bob' })
      )
    })

    it('updates Crown at end of table round and explodes bomb when countdown expires', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      game.players[0].score = 2000
      game.players[1].score = 1000

      game.bombState = { holderIndex: 1, remainingTableRounds: 1 }

      // Alice plays
      game.advanceTurn()
      expect(game.turnsPlayedInRound).toBe(1)

      // Bob plays -> round finishes
      game.advanceTurn()
      expect(game.tableRoundCount).toBe(1)
      expect(game.crownHolderIndex).toBe(0) // Alice is leader
      expect(game.crownBountyAvailable).toBe(true)

      // Bomb explodes on Bob
      expect(game.bombState).toBeNull()
      expect(game.events).toContainEqual(
        expect.objectContaining({ type: 'bomb-exploded', player: 'Bob' })
      )
    })

    it('triggers table event every 10 table rounds', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      game.tableRoundCount = 9
      game.turnsPlayedInRound = 1

      game.advanceTurn()
      expect(game.tableRoundCount).toBe(10)
      expect(game.activeTableEvent).not.toBeNull()
    })
  })

  describe('resolvePendingInteraction', () => {
    it('throws when resolving with no pending interaction', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      expect(() => game.resolvePendingInteraction()).toThrow('No pending interaction to resolve')
    })

    it('resolves architect interaction and helper', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      game.pendingInteractions.push({
        type: 'architect',
        tier: 20000,
        architectPlayerIndex: 0,
        recipientPlayerIndex: 1,
        choices: ['bouclier', 'doubleur', 'gel'],
      })

      expect(() => game.resolveArchitectChoice('unknown')).toThrow(
        'Invalid architect card choice: unknown'
      )
      const events = game.resolveArchitectChoice('doubleur')
      expect(game.players[1].hand).toContain('doubleur')
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'architect-resolved',
          architect: 'Alice',
          recipient: 'Bob',
          cardId: 'doubleur',
        })
      )
    })

    it('resolves answer-42 interaction', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      game.pendingInteractions.push({
        type: 'answer-42',
        playerIndex: 0,
        choices: ['bouclier', 'doubleur'],
      })

      expect(() => game.resolvePendingInteraction({ cardId: 'invalid' })).toThrow(
        'Invalid answer-42 card choice: invalid'
      )
      game.resolvePendingInteraction({ cardId: 'bouclier' })
      expect(game.players[0].hand).toContain('bouclier')
    })

    it('resolves hand-overflow interaction and helper', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      const alice = game.players[0]
      alice.hand = ['card1', 'card2', 'card3']
      game.pendingInteractions.push({
        type: 'hand-overflow',
        playerIndex: 0,
        player: 'Alice',
        incomingCardId: 'incoming',
        choices: ['card1', 'card2', 'card3', 'incoming'],
      })

      expect(() => game.resolveHandOverflow('invalid')).toThrow(
        'Invalid card choice to discard: invalid'
      )

      // Discard incoming card
      game.resolveHandOverflow('incoming')
      expect(alice.hand).toEqual(['card1', 'card2', 'card3'])

      // Discard one from hand
      game.pendingInteractions.push({
        type: 'hand-overflow',
        playerIndex: 0,
        player: 'Alice',
        incomingCardId: 'incoming2',
        choices: ['card1', 'card2', 'card3', 'incoming2'],
      })
      game.resolveHandOverflow('card2')
      expect(alice.hand).toEqual(['card1', 'card3', 'incoming2'])
    })

    it('resolves defensive-reaction: skip, bouclier, parachute, miroir', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      const bob = game.players[1]
      bob.score = 500
      bob.checkpointHistory = [0, 500]

      // 1. Skip
      game.pendingInteractions.push({
        type: 'defensive-reaction',
        victimIndex: 1,
        attackerIndex: 0,
        from: 1000,
        to: 500,
        checkpointHistoryBefore: [0, 500, 1000],
        availableCards: ['bouclier'],
      })
      bob.hand.push('bouclier')
      let events = game.resolvePendingInteraction({ skip: true })
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'defensive-reaction-skipped', player: 'Bob' })
      )

      // 2. Bouclier -> restores score & history
      game.pendingInteractions.push({
        type: 'defensive-reaction',
        victimIndex: 1,
        attackerIndex: 0,
        from: 1000,
        to: 500,
        checkpointHistoryBefore: [0, 500, 1000],
        availableCards: ['bouclier'],
      })
      events = game.resolvePendingInteraction({ cardId: 'bouclier' })
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'shield-used', player: 'Bob', restoredScore: 1000 })
      )
      expect(bob.score).toBe(1000)

      // 3. Parachute -> dropHalfGap
      bob.hand.push('parachute')
      bob.score = 500
      bob.checkpointHistory = [0, 500]
      game.pendingInteractions.push({
        type: 'defensive-reaction',
        victimIndex: 1,
        attackerIndex: 0,
        from: 1200,
        to: 400,
        checkpointHistoryBefore: [0, 400, 1200],
        availableCards: ['parachute'],
      })
      events = game.resolvePendingInteraction({ cardId: 'parachute' })
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'parachute-used', player: 'Bob' })
      )

      // 4. Miroir -> attacker drops
      bob.hand.push('miroir')
      game.players[0].score = 1500
      game.players[0].checkpointHistory = [0, 1000, 1500]
      game.pendingInteractions.push({
        type: 'defensive-reaction',
        victimIndex: 1,
        attackerIndex: 0,
        from: 1000,
        to: 500,
        checkpointHistoryBefore: [0, 500, 1000],
        availableCards: ['miroir'],
      })
      events = game.resolvePendingInteraction({ cardId: 'miroir' })
      expect(events).toContainEqual(expect.objectContaining({ type: 'mirror-used', player: 'Bob' }))
      expect(game.players[0].score).toBe(1000) // attacker dropped
    })

    it('resolves shop interaction: skip, buy cards, validation errors', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      const alice = game.players[0]
      alice.score = 5000

      // Skip helper
      game.pendingInteractions.push({
        type: 'shop',
        playerIndex: 0,
        tier: 20000,
      })
      const skipEv = game.skipShop()
      expect(skipEv).toContainEqual(
        expect.objectContaining({ type: 'shop-skipped', player: 'Alice' })
      )

      // Purchase validation
      game.pendingInteractions.push({
        type: 'shop',
        playerIndex: 0,
        tier: 20000,
      })
      expect(() => game.buyShopCard('ultra-rare')).toThrow('Invalid shop rarity: ultra-rare')

      alice.score = 500
      expect(() => game.buyShopCard('common')).toThrow('Not enough points for shop purchase')

      alice.score = 3000
      const buyEv = game.buyShopCard('rare') // 2000 pts
      expect(alice.score).toBe(1000)
      expect(buyEv).toContainEqual(
        expect.objectContaining({ type: 'shop-purchased', rarity: 'rare', cost: 2000 })
      )
    })
  })

  describe('Full Cent Mille snapshot serialization and undo', () => {
    it('serializes and deserializes full Cent Mille state', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      game.players[0].hand.push('bouclier')
      game.players[0].exactTiersClaimed = [20000]
      game.players[1].status.frozen = true
      game.activeBets.push({ betterIndex: 0, targetIndex: 1 })
      game.bombState = { holderIndex: 1, remainingTableRounds: 2 }
      game.crossedGlobalTiers.push(20000)
      game.crownHolderIndex = 0
      game.crownBountyAvailable = true
      game.firstBloodAwarded = true
      game.coupDeclatAwarded = true

      const snapshot = game.getSnapshot()
      const restored = Game.fromSnapshot(snapshot)

      expect(restored.mode).toBe('cent-mille')
      expect(restored.players[0].hand).toEqual(['bouclier'])
      expect(restored.players[0].exactTiersClaimed).toEqual([20000])
      expect(restored.players[1].status.frozen).toBe(true)
      expect(restored.activeBets).toEqual([{ betterIndex: 0, targetIndex: 1 }])
      expect(restored.bombState).toEqual({ holderIndex: 1, remainingTableRounds: 2 })
      expect(restored.crossedGlobalTiers).toEqual([20000])
      expect(restored.crownHolderIndex).toBe(0)
      expect(restored.crownBountyAvailable).toBe(true)
      expect(restored.firstBloodAwarded).toBe(true)
      expect(restored.coupDeclatAwarded).toBe(true)
      expect(restored.getSnapshot()).toEqual(snapshot)
    })

    it('undoes turn and restores coupDeclatAwarded', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      const alice = game.players[0]
      alice.hasOpened = true

      expect(game.coupDeclatAwarded).toBe(false)
      game.recordTurn(2000)
      expect(game.coupDeclatAwarded).toBe(true)

      game.undoLastEvent()
      expect(game.coupDeclatAwarded).toBe(false)
    })

    it('undoes card play and restores previous state', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      const alice = game.players[0]
      alice.hand.push('doubleur')

      const beforePlay = game.getSnapshot()
      game.playCard('doubleur')
      expect(alice.hand).toEqual([])
      expect(game.activeTurnModifiers.doubleur).toBe(true)

      const restored = game.undoLastEvent()
      expect(restored).toEqual(beforePlay)
      expect(game.players[0].hand).toEqual(['doubleur'])
      expect(game.activeTurnModifiers.doubleur).toBe(false)
    })
  })

  describe('Edge cases and full branch coverage', () => {
    it('sets winner when playCard causes player to reach targetScore', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      const alice = game.players[0]
      const bob = game.players[1]
      alice.score = 98000
      bob.score = 100000
      alice.hand.push('teleporteur')

      game.playCard('teleporteur')
      expect(alice.score).toBe(100000)
      expect(game.winner?.name).toBe('Alice')
    })

    it('resolves duel where target scores higher than challenger', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      game.activeDuels = [
        { challengerIndex: 0, targetIndex: 1, challengerScore: null, targetScore: null },
      ]
      game.recordTurn(500)
      const events = game.recordTurn(1000)
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'duel-resolved', winner: 'Bob', loser: 'Alice' })
      )
    })

    it('handles player drop with attackerIndex and offers defensive reaction with miroir', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      const bob = game.players[1]
      bob.score = 1000
      bob.checkpointHistory = [0, 1000]
      bob.hand.push('miroir')

      game.handlePlayerDrop(1, 0, 1, game.events, 'test')
      expect(game.pendingInteractions).toContainEqual(
        expect.objectContaining({
          type: 'defensive-reaction',
          victimIndex: 1,
          availableCards: ['miroir'],
        })
      )
    })

    it('triggers specific table events: sens-inverse, pluie-de-cartes, mutinerie', () => {
      // 1. sens-inverse (index 4 in TABLE_EVENTS)
      const game1 = new Game(['Alice', 'Bob', 'Charlie'], {
        mode: 'cent-mille',
        rng: () => 4 / 8,
      })
      game1.triggerRandomTableEvent(game1.events)
      expect(game1.turnDirection).toBe(-1)

      // 2. pluie-de-cartes (index 5)
      const game2 = new Game(['Alice', 'Bob'], {
        mode: 'cent-mille',
        rng: () => 5 / 8,
      })
      game2.triggerRandomTableEvent(game2.events)
      expect(game2.players[0].hand.length).toBeGreaterThan(0)
      expect(game2.players[1].hand.length).toBeGreaterThan(0)

      // 3. mutinerie (index 6)
      const game3 = new Game(['Alice', 'Bob'], {
        mode: 'cent-mille',
        rng: () => 6 / 8,
      })
      game3.players[0].score = 5000 // leader
      game3.players[0].hand = ['bouclier']
      game3.players[1].score = 1000 // last
      game3.triggerRandomTableEvent(game3.events)
      expect(game3.players[1].hand).toContain('bouclier')
    })

    it('rejects invalid Cent Mille turns: non-multiple of 100, open below 500, overshoot 100000', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      expect(() => game.recordTurn(150)).toThrow('Cannot stop on a non-multiple of 100')
      expect(() => game.recordTurn(400)).toThrow('Cannot open below 500 points')

      game.players[0].hasOpened = true
      game.players[0].score = 99900
      expect(() => game.recordTurn(200)).toThrow('Cannot overshoot 100000 points')
    })

    it('defaults bomb target to next player when bombTargetIndex is omitted', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      game.bombState = { holderIndex: 0, remainingTableRounds: 3 }
      game.recordTurn(1000) // no bombTargetIndex passed
      expect(game.bombState.holderIndex).toBe(1)
    })

    it('marks winner when recordTurn reaches exact 100000 in Cent Mille', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      const alice = game.players[0]
      alice.hasOpened = true
      alice.score = 99000
      alice.checkpointHistory = [0, 99000]

      game.recordTurn(1000)
      expect(alice.score).toBe(100000)
      expect(game.winner?.name).toBe('Alice')
    })

    it('handles crown tie at end of round (no crown given if tied)', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      game.players[0].score = 2000
      game.players[1].score = 2000

      game.advanceTurn() // turnsPlayed = 1
      game.advanceTurn() // round ends, countWithMax = 2
      expect(game.crownHolderIndex).toBeNull()
    })

    it('expires Tax Collector when remaining turns reach 0', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      game.activeTaxCollector = { collectorIndex: 0, remainingTurns: 1 }

      game.advanceTurn()
      expect(game.activeTaxCollector).toBeNull()
    })

    it('offers defensive reaction on bomb explosion when holder has defensive card', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      const bob = game.players[1]
      bob.score = 2000
      bob.checkpointHistory = [0, 1000, 2000]
      bob.hand.push('bouclier')
      game.bombState = { holderIndex: 1, remainingTableRounds: 1 }

      game.advanceTurn() // Alice plays
      game.advanceTurn() // Bob plays -> round ends, bomb explodes!
      expect(game.pendingInteractions).toContainEqual(
        expect.objectContaining({ type: 'defensive-reaction', victimIndex: 1 })
      )
    })

    it('decrements table event and tax collector when skipping frozen players', () => {
      const game = new Game(['Alice', 'Bob', 'Charlie'], { mode: 'cent-mille' })
      game.activeTableEvent = { id: 'test', remainingTurns: 2 }
      game.activeTaxCollector = { collectorIndex: 0, remainingTurns: 2 }
      game.players[1].status.frozen = true
      game.turnsPlayedInRound = 1 // Alice takes it to 2, Bob's skip takes it to 3 (round end)

      game.advanceTurn()
      expect(game.activeTableEvent).toBeNull()
      expect(game.activeTaxCollector).toBeNull()
      expect(game.turnsPlayedInRound).toBe(0)
    })

    it('throws on invalid defensive reaction card', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      game.pendingInteractions.push({
        type: 'defensive-reaction',
        victimIndex: 0,
        attackerIndex: null,
        availableCards: ['bouclier'],
      })
      expect(() => game.resolvePendingInteraction({ cardId: 'parachute' })).toThrow(
        'Invalid defensive card: parachute'
      )
    })

    it('gives attacker defensive reaction if mirror causes attacker to drop and attacker has shield', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      const alice = game.players[0]
      const bob = game.players[1]
      alice.score = 2000
      alice.checkpointHistory = [0, 1000, 2000]
      alice.hand.push('bouclier')

      bob.hand.push('miroir')
      game.pendingInteractions.push({
        type: 'defensive-reaction',
        victimIndex: 1,
        attackerIndex: 0,
        from: 1000,
        to: 500,
        checkpointHistoryBefore: [0, 500, 1000],
        availableCards: ['miroir'],
      })

      game.resolvePendingInteraction({ cardId: 'miroir' })
      expect(alice.score).toBe(1000)
      expect(game.pendingInteractions).toContainEqual(
        expect.objectContaining({ type: 'defensive-reaction', victimIndex: 0 })
      )
    })

    it('throws on unknown pending interaction type', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      game.pendingInteractions.push({ type: 'alien-interaction' })
      expect(() => game.resolvePendingInteraction()).toThrow(
        'Unknown pending interaction type: alien-interaction'
      )
    })

    it('restores activeDuels and pendingInteractions from snapshot in fromSnapshot', () => {
      const snapshot = {
        targetScore: 100000,
        openingScore: 500,
        mode: 'cent-mille',
        currentPlayerIndex: 0,
        players: [
          { name: 'Alice', score: 500, previousCheckpointScore: 0, hasOpened: true },
          { name: 'Bob', score: 0, previousCheckpointScore: 0, hasOpened: false },
        ],
        winnerIndex: null,
        activeDuels: [
          { challengerIndex: 0, targetIndex: 1, challengerScore: null, targetScore: null },
        ],
        pendingInteractions: [{ type: 'shop', playerIndex: 0, tier: 20000 }],
      }
      const restored = Game.fromSnapshot(snapshot)
      expect(restored.activeDuels).toHaveLength(1)
      expect(restored.pendingInteractions).toHaveLength(1)
    })
  })

  describe('Dix Mille Bonus mode', () => {
    it('initializes with Dix Mille Bonus mode defaults', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'dix-mille-bonus' })
      expect(game.targetScore).toBe(10000)
      expect(game.openingScore).toBe(500)
      expect(game.modeConfig.handLimit).toBe(2)
      expect(game.modeConfig.tiers).toEqual([5000])
      expect(game.modeConfig.shopEnabled).toBe(false)
      expect(game.modeConfig.crownEnabled).toBe(false)
      expect(game.modeConfig.redZoneEnabled).toBe(true)
      expect(game.modeConfig.redZoneThreshold).toBe(9000)
      expect(game.modeConfig.redZoneSabotageEnabled).toBe(false)
      expect(game.modeConfig.periodicTableEventsEnabled).toBe(false)
      expect(game.modeConfig.consolationProbability).toBe(0.5)
      expect(game.modeConfig.consolationCollisionOnly).toBe(true)
      expect(game.modeConfig.pickpocketAmount).toBe(500)
      expect(game.modeConfig.welcomeCardThreshold).toBe(1000)
      expect(game.welcomeCardGivenTo).toEqual([])

      const snapshot = game.getSnapshot()
      expect(snapshot.mode).toBe('dix-mille-bonus')
      expect(snapshot.redZoneThreshold).toBe(9000)
      expect(snapshot.handLimit).toBe(2)
      expect(snapshot.welcomeCardGivenTo).toEqual([])
    })

    it('enforces hand limit of 2 and triggers overflow on 3rd card', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'dix-mille-bonus' })
      const alice = game.players[0]

      game.giveCardToPlayer(0, 'bouclier')
      game.giveCardToPlayer(0, 'doubleur')
      expect(alice.hand).toEqual(['bouclier', 'doubleur'])
      expect(game.pendingInteractions).toHaveLength(0)

      game.giveCardToPlayer(0, 'gel')
      expect(game.pendingInteractions).toHaveLength(1)
      expect(game.pendingInteractions[0]).toEqual(
        expect.objectContaining({
          type: 'hand-overflow',
          playerIndex: 0,
          choices: ['bouclier', 'doubleur', 'gel'],
        })
      )

      game.resolveHandOverflow('doubleur')
      expect(alice.hand).toEqual(['bouclier', 'gel'])
      expect(game.pendingInteractions).toHaveLength(0)
    })

    it('draws cards restricted to the 17 allowed mode cards', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'dix-mille-bonus' })
      for (let i = 0; i < 30; i++) {
        const randomCard = game.drawModeRandomCard()
        expect(game.modeConfig.deckCardIds).toContain(randomCard.id)
      }
      const distinct = game.drawModeDistinctCards(3)
      expect(distinct).toHaveLength(3)
      for (const c of distinct) {
        expect(game.modeConfig.deckCardIds).toContain(c.id)
      }
    })

    it('awards welcome card once when reaching >= 1000 points, survives tiers, and never duplicates', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'dix-mille-bonus' })
      const alice = game.players[0]

      // Turn 1: Alice scores 600 (opens). No welcome card yet.
      game.recordTurn(600)
      expect(alice.score).toBe(600)
      expect(alice.hand).toHaveLength(0)
      expect(game.welcomeCardGivenTo).toEqual([])

      // Bob's turn: Bob scores 500 (opens, no collision with Alice at 600)
      game.recordTurn(500)
      expect(game.players[1].score).toBe(500)

      // Turn 2: Alice scores 500 -> total 1100. Welcome card threshold (>= 1000) reached!
      const events = game.recordTurn(500)
      expect(alice.score).toBe(1100)
      expect(alice.hand).toHaveLength(1)
      expect(game.welcomeCardGivenTo).toEqual([0])
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'card-drawn',
          player: 'Alice',
          reason: 'welcome',
        })
      )

      // Bob collides with Alice: Bob scores 600 -> total 1100! Alice drops from 1100 to 600!
      // Bob reached 1100 (>= 1000), Bob receives welcome card + achievement card for premier-sang
      game.recordTurn(600)
      expect(game.players[1].score).toBe(1100)
      expect(game.players[1].hand).toHaveLength(2)
      expect(game.welcomeCardGivenTo).toEqual([0, 1])
      expect(alice.score).toBe(600)

      // Alice now at 600. Next turn Alice scores 500 -> total 1100.
      // Alice already received welcome card, so no duplicate welcome card!
      const aliceHandCountBefore = alice.hand.length
      game.recordTurn(500)
      expect(alice.score).toBe(1100)
      expect(alice.hand.length).toBe(aliceHandCountBefore)
      expect(game.welcomeCardGivenTo).toEqual([0, 1])
    })

    it('handles tier 5000 crossing: expires cards, triggers architect and table event, no shop', () => {
      let rngStep = 0
      const stubRng = () => {
        rngStep += 0.1
        return (rngStep * 0.3) % 1
      }
      const game = new Game(['Alice', 'Bob'], { mode: 'dix-mille-bonus', rng: stubRng })
      const alice = game.players[0]
      const bob = game.players[1]

      alice.hasOpened = true
      alice.score = 4500
      alice.checkpointHistory = [0, 4500]
      alice.hand = ['arrondi', 'reset']

      bob.hasOpened = true
      bob.score = 1000
      bob.checkpointHistory = [0, 1000]

      const events = game.recordTurn(500)
      expect(alice.score).toBe(5000)
      // Alice cards expired
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'cards-expired',
          player: 'Alice',
          cards: ['arrondi', 'reset'],
        })
      )
      // Exact tier magic number at 5000 gives bouclier!
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'magic-number',
          magicId: 'exact-tier',
        })
      )
      // Welcome card at >= 1000 given after tier crossing
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'card-drawn',
          reason: 'welcome',
        })
      )
      // Architect interaction for tier 5000 giving choices to Bob (lowest score)
      expect(game.pendingInteractions).toContainEqual(
        expect.objectContaining({
          type: 'architect',
          tier: 5000,
          architectPlayerIndex: 0,
          recipientPlayerIndex: 1,
        })
      )
      // No shop interaction
      expect(game.pendingInteractions.some((pi) => pi.type === 'shop')).toBe(false)
      // Table event was triggered
      expect(events.some((e) => e.type === 'table-event')).toBe(true)
      const tableEvent = events.find((e) => e.type === 'table-event')
      expect(game.modeConfig.allowedTableEventIds).toContain(tableEvent.eventId)
    })

    it('triggers only 5000 (exact-tier), 6600 (devil), 7700 (jackpot) magic numbers in dix-mille-bonus', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'dix-mille-bonus' })
      const alice = game.players[0]

      // 6600: devil drops 1 checkpoint without awarding consolation
      alice.hasOpened = true
      alice.score = 5000
      alice.checkpointHistory = [0, 5000]
      alice.previousCheckpointScore = 0
      alice.highestTierReached = 5000
      game.welcomeCardGivenTo = [0] // already got welcome card

      const eventsDevil = game.recordTurn(1600)
      expect(eventsDevil).toContainEqual(
        expect.objectContaining({ type: 'magic-number', magicId: 'devil' })
      )
      expect(alice.score).toBe(5000)
      // Consolation is collision-only in dix-mille-bonus, so devil drop does not give consolation
      expect(eventsDevil.some((e) => e.type === 'consolation')).toBe(false)
      expect(alice.unrewardedDrops).toBe(0)

      // 7700: jackpot gives a legendary card from the 17-card deck
      game.currentPlayerIndex = 0
      alice.score = 7000
      alice.checkpointHistory = [0, 5000, 7000]
      const eventsJackpot = game.recordTurn(700)
      expect(eventsJackpot).toContainEqual(
        expect.objectContaining({ type: 'magic-number', magicId: 'jackpot' })
      )
      const legCard = alice.hand.at(-1)
      expect(['cameleon', 'miroir', 'bis']).toContain(legCard)

      // Unlisted magic score in dix-mille-bonus
      game.currentPlayerIndex = 0
      alice.score = 4000
      alice.checkpointHistory = [0, 4000]
      const eventsNoMagic = game.recordTurn(200)
      expect(eventsNoMagic.some((e) => e.type === 'magic-number')).toBe(false)
    })

    it('handles consolation strictly on collisions and miroir reflection, not on bust drop', () => {
      // 1. Bust drop in dix-mille-bonus
      const gameBust = new Game(['Alice', 'Bob'], { mode: 'dix-mille-bonus' })
      const aliceBust = gameBust.players[0]
      aliceBust.hasOpened = true
      aliceBust.score = 2000
      aliceBust.checkpointHistory = [0, 1000, 2000]
      aliceBust.failedTurnsInRow = 2

      const bustEvents = gameBust.recordBust()
      expect(bustEvents).toContainEqual(
        expect.objectContaining({ type: 'downgrade', player: 'Alice', from: 2000, to: 1000 })
      )
      expect(bustEvents.some((e) => e.type === 'consolation')).toBe(false)
      expect(aliceBust.unrewardedDrops).toBe(0)

      // 2. Collision drop in dix-mille-bonus with rng stub (p = 0.5)
      // When rng returns 0.2 (< 0.5), consolation awarded
      let rngVal = 0.2
      const gameCol = new Game(['Alice', 'Bob'], {
        mode: 'dix-mille-bonus',
        rng: () => rngVal,
      })
      const aliceCol = gameCol.players[0]
      const bobCol = gameCol.players[1]
      aliceCol.hasOpened = true
      aliceCol.score = 1500
      aliceCol.checkpointHistory = [0, 1000, 1500]

      bobCol.hasOpened = true
      bobCol.score = 500
      bobCol.checkpointHistory = [0, 500]
      gameCol.welcomeCardGivenTo = [0, 1]

      // Bob scores 1000 -> collisions with Alice at 1500!
      gameCol.currentPlayerIndex = 1
      const colEvents = gameCol.recordTurn(1000)
      expect(colEvents).toContainEqual(
        expect.objectContaining({ type: 'downgrade', player: 'Alice', from: 1500, to: 1000 })
      )
      expect(colEvents).toContainEqual(
        expect.objectContaining({ type: 'consolation', player: 'Alice' })
      )
      expect(aliceCol.unrewardedDrops).toBe(0)

      // When rng returns 0.8 (>= 0.5), consolation NOT awarded, unrewardedDrops increments
      rngVal = 0.8
      const gameCol2 = new Game(['Alice', 'Bob'], {
        mode: 'dix-mille-bonus',
        rng: () => rngVal,
      })
      const alice2 = gameCol2.players[0]
      const bob2 = gameCol2.players[1]
      alice2.hasOpened = true
      alice2.score = 1500
      alice2.checkpointHistory = [0, 1000, 1500]
      bob2.hasOpened = true
      bob2.score = 500
      bob2.checkpointHistory = [0, 500]
      gameCol2.welcomeCardGivenTo = [0, 1]

      gameCol2.currentPlayerIndex = 1
      const colEvents2 = gameCol2.recordTurn(1000)
      expect(colEvents2.some((e) => e.type === 'consolation')).toBe(false)
      expect(alice2.unrewardedDrops).toBe(1)

      // Pity rule: when unrewardedDrops >= 2, consolation guaranteed even with rng >= 0.5
      alice2.unrewardedDrops = 2
      gameCol2.handleConsolation(0, colEvents2, 'collision')
      expect(alice2.unrewardedDrops).toBe(0)

      // 3. Miroir reflection awards consolation to attacker
      rngVal = 0.1
      const gameMir = new Game(['Alice', 'Bob'], {
        mode: 'dix-mille-bonus',
        rng: () => rngVal,
      })
      const aliceMir = gameMir.players[0]
      const bobMir = gameMir.players[1]
      aliceMir.hasOpened = true
      aliceMir.score = 2000
      aliceMir.checkpointHistory = [0, 1000, 2000]

      bobMir.hasOpened = true
      bobMir.score = 2000
      bobMir.checkpointHistory = [0, 1000, 2000]
      bobMir.hand = ['miroir']
      gameMir.welcomeCardGivenTo = [0, 1]

      gameMir.pendingInteractions.push({
        type: 'defensive-reaction',
        victimIndex: 1,
        attackerIndex: 0,
        from: 2000,
        to: 1000,
        checkpointHistoryBefore: [0, 1000, 2000],
        availableCards: ['miroir'],
      })

      const mirEvents = gameMir.resolvePendingInteraction({ cardId: 'miroir' })
      expect(mirEvents).toContainEqual(
        expect.objectContaining({ type: 'downgrade', player: 'Alice', from: 2000, to: 1000 })
      )
      expect(mirEvents).toContainEqual(
        expect.objectContaining({ type: 'consolation', player: 'Alice' })
      )
    })

    it('triggers Red Zone at 9000 without sabotage cards and blocks offensive cards', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'dix-mille-bonus' })
      const alice = game.players[0]
      const bob = game.players[1]

      alice.hasOpened = true
      alice.score = 8000
      alice.checkpointHistory = [0, 8000]
      alice.highestTierReached = 5000
      game.crossedGlobalTiers = [5000]
      game.welcomeCardGivenTo = [0, 1]

      const events = game.recordTurn(1000)
      expect(alice.score).toBe(9000)
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'red-zone',
          player: 'Alice',
          threshold: 9000,
          sabotage: false,
        })
      )
      // No sabotage cards given to Bob
      expect(bob.hand).toHaveLength(0)

      // Alice cannot play offensive cards (e.g. gel, malediction, pickpocket)
      game.currentPlayerIndex = 0
      alice.hand.push('gel')
      expect(() => game.playCard('gel', { targetIndex: 1 })).toThrow(
        'Cannot play offensive card in Red Zone'
      )
    })

    it('steals 500 points with pickpocket and validates threshold of 500 in dix-mille-bonus', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'dix-mille-bonus' })
      const alice = game.players[0]
      const bob = game.players[1]

      alice.hasOpened = true
      alice.score = 500
      alice.checkpointHistory = [0, 500]
      alice.hand.push('pickpocket')

      // Bob has 400 (< 500)
      bob.hasOpened = true
      bob.score = 400
      bob.checkpointHistory = [0, 400]

      expect(() => game.playCard('pickpocket')).toThrow('No opponent with at least 500 points')

      // Bob reaches 500
      bob.score = 500
      bob.checkpointHistory = [0, 500]

      const events = game.playCard('pickpocket')
      expect(events).toContainEqual({
        type: 'pickpocket',
        thief: 'Alice',
        victim: 'Bob',
        amount: 500,
      })
      expect(bob.score).toBe(0)
      expect(alice.score).toBe(1000)
    })

    it('never updates crown and never triggers periodic table events', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'dix-mille-bonus' })
      game.welcomeCardGivenTo = [0, 1]

      // Play 20 turns (10 table rounds)
      for (let i = 0; i < 20; i++) {
        game.recordTurn(500)
      }
      expect(game.tableRoundCount).toBe(10)
      expect(game.crownHolderIndex).toBeNull()
      expect(game.activeTableEvent).toBeNull()
      expect(game.events.some((e) => e.type === 'crown-changed')).toBe(false)
      expect(game.events.some((e) => e.type === 'table-event')).toBe(false)
    })

    it('filters achievements to only premier-sang, miracule, and coup-declat', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'dix-mille-bonus' })
      const alice = game.players[0]
      const bob = game.players[1]
      alice.hasOpened = true
      alice.score = 500
      alice.checkpointHistory = [0, 500]
      bob.hasOpened = true
      bob.score = 2500
      bob.checkpointHistory = [0, 2500]
      game.welcomeCardGivenTo = [0, 1]

      // Alice scores 2000 -> cumulative 2500 -> collides with Bob!
      // Triggers coup-declat AND premier-sang!
      const events = game.recordTurn(2000)
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'achievement', achievementId: 'coup-declat' })
      )
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'achievement', achievementId: 'premier-sang' })
      )

      // Test that unallowed achievements (e.g. bourreau or phenix) are not awarded
      alice.achievements = []
      alice.scoreBeforeLastDrop = 3000
      alice.score = 1000
      alice.checkpointHistory = [0, 1000]
      game.currentPlayerIndex = 0
      // Turn with score 2000 recovers from drop (phenix condition)
      const events2 = game.recordTurn(2000)
      expect(events2.some((e) => e.achievementId === 'phenix')).toBe(false)
    })

    it('serializes snapshot, deserializes, and restores welcomeCardGivenTo on undo in dix-mille-bonus', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'dix-mille-bonus' })
      game.recordTurn(600) // Alice 600
      game.recordTurn(500) // Bob 500 (no collision)
      game.recordTurn(500) // Alice 1100 -> welcome card!
      expect(game.welcomeCardGivenTo).toEqual([0])

      const snapshot = game.getSnapshot()
      expect(snapshot.welcomeCardGivenTo).toEqual([0])
      expect(snapshot.redZoneThreshold).toBe(9000)
      expect(snapshot.handLimit).toBe(2)

      const restored = Game.fromSnapshot(snapshot)
      expect(restored.welcomeCardGivenTo).toEqual([0])
      expect(restored.getSnapshot()).toEqual(snapshot)

      // Undo the welcome card turn
      game.undoLastEvent()
      expect(game.welcomeCardGivenTo).toEqual([])
      expect(game.players[0].hand).toHaveLength(0)
    })
  })

  describe('Cent Mille mode regressions verification', () => {
    it('keeps Cent Mille rules: crown, hand limit 3, pickpocket 1000, periodic events, sabotage cards, consolation on bust', () => {
      const game = new Game(['Alice', 'Bob'], { mode: 'cent-mille' })
      expect(game.targetScore).toBe(100000)
      expect(game.modeConfig.handLimit).toBe(3)
      expect(game.modeConfig.crownEnabled).toBe(true)
      expect(game.modeConfig.periodicTableEventsEnabled).toBe(true)
      expect(game.modeConfig.redZoneThreshold).toBe(90000)
      expect(game.modeConfig.redZoneSabotageEnabled).toBe(true)
      expect(game.modeConfig.pickpocketAmount).toBe(1000)
      expect(game.modeConfig.consolationCollisionOnly).toBe(false)
      expect(game.modeConfig.consolationProbability).toBeCloseTo(1 / 3)
      expect(game.modeConfig.welcomeCardThreshold).toBeNull()

      // Hand limit of 3
      game.giveCardToPlayer(0, 'bouclier')
      game.giveCardToPlayer(0, 'doubleur')
      game.giveCardToPlayer(0, 'gel')
      expect(game.players[0].hand).toHaveLength(3)
      expect(game.pendingInteractions).toHaveLength(0)

      // Consolation on 3-fail drop still possible (with pity or prob)
      const alice = game.players[0]
      alice.hasOpened = true
      alice.score = 20000
      alice.checkpointHistory = [0, 10000, 20000]
      alice.failedTurnsInRow = 2
      alice.unrewardedDrops = 2 // pity rule
      const bustEvents = game.recordBust()
      expect(bustEvents).toContainEqual(
        expect.objectContaining({ type: 'consolation', player: 'Alice' })
      )

      // Pickpocket requires 1000
      game.currentPlayerIndex = 0
      alice.hand.push('pickpocket')
      expect(() => game.playCard('pickpocket')).toThrow('No opponent with at least 1000 points')

      // Red zone distributes sabotage cards
      alice.score = 89000
      alice.checkpointHistory = [0, 89000]
      game.currentPlayerIndex = 0
      const rzEvents = game.recordTurn(1000)
      expect(rzEvents).toContainEqual(
        expect.objectContaining({
          type: 'red-zone',
          threshold: 90000,
          sabotage: true,
        })
      )
      expect(game.players[1].hand.length).toBeGreaterThan(0)
    })
  })
})
