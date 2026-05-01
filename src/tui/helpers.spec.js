import { describe, expect, it } from 'vitest'
import {
  formatStatus,
  makeStealChoiceInfo,
  parseDiceArg,
  parsePlayersArg,
  shouldPromptStealChoice,
  shouldTriggerManualRoll,
} from './helpers.js'

describe('tui helpers', () => {
  describe('parseDiceArg', () => {
    it('returns parsed integers', () => {
      expect(parseDiceArg('1, 5,6')).toEqual([1, 5, 6])
    })

    it('returns null for invalid input', () => {
      expect(parseDiceArg('')).toBeNull()
      expect(parseDiceArg('a,b')).toBeNull()
    })
  })

  describe('parsePlayersArg', () => {
    it('returns trimmed players for at least two names', () => {
      expect(parsePlayersArg('Alice, Bob')).toEqual(['Alice', 'Bob'])
    })

    it('returns null for missing or single player', () => {
      expect(parsePlayersArg('')).toBeNull()
      expect(parsePlayersArg('Alice')).toBeNull()
    })
  })

  describe('manual roll helper', () => {
    it('triggers roll only on space during rolling phase', () => {
      expect(shouldTriggerManualRoll({ phase: 'rolling' }, ' ')).toBe(true)
      expect(shouldTriggerManualRoll({ phase: 'rolling' }, 'r')).toBe(false)
      expect(shouldTriggerManualRoll({ phase: 'awaitingDecision' }, ' ')).toBe(false)
      expect(shouldTriggerManualRoll(null, ' ')).toBe(false)
    })
  })

  describe('steal choice helpers', () => {
    it('prompts when awaiting turn start with stealable carried score', () => {
      const snapshot = {
        phase: 'awaitingTurnStart',
        currentPlayerIndex: 1,
        players: [{ name: 'Alice' }, { name: 'Bob' }],
      }
      const turnStartState = { canSteal: true, carriedScore: 500, diceToRoll: 2 }

      expect(shouldPromptStealChoice(snapshot, turnStartState)).toBe(true)
      expect(makeStealChoiceInfo(snapshot, turnStartState)).toEqual({
        playerName: 'Bob',
        carriedScore: 500,
        diceToRoll: 2,
      })
    })

    it('does not prompt when no steal is available', () => {
      const snapshot = {
        phase: 'awaitingTurnStart',
        currentPlayerIndex: 0,
        players: [{ name: 'Alice' }, { name: 'Bob' }],
      }
      const turnStartState = { canSteal: false, carriedScore: 0, diceToRoll: 5 }

      expect(shouldPromptStealChoice(snapshot, turnStartState)).toBe(false)
      expect(makeStealChoiceInfo(snapshot, turnStartState)).toBeNull()
    })
  })

  describe('formatStatus', () => {
    it('returns empty game status when no active game', () => {
      expect(formatStatus(null)).toEqual({
        currentPlayer: 'aucun',
        winner: 'aucun',
        activeTurn: 'aucun',
        stagedRoll: 'aucun',
        scores: ['Aucune partie active. Appuyez sur n pour commencer.'],
      })
    })

    it('formats snapshot status', () => {
      const snapshot = {
        currentPlayerIndex: 1,
        winnerIndex: null,
        activeTurn: { turnScore: 200, diceToRoll: 3, canSteal: false },
        pendingRoll: { rolledDice: [1, 2, 3] },
        players: [
          { name: 'Alice', score: 500, failedTurnsInRow: 0 },
          { name: 'Bob', score: 1200, failedTurnsInRow: 1 },
        ],
      }

      const status = formatStatus(snapshot)

      expect(status.currentPlayer).toBe('Bob')
      expect(status.winner).toBe('aucun')
      expect(status.stagedRoll).toBe('1,2,3')
      expect(status.activeTurn).toContain('turnScore=200')
      expect(status.scores).toEqual(['  Alice: 500 pts (fails: 0)', '> Bob: 1200 pts (fails: 1)'])
    })
  })
})
