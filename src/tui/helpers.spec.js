import { describe, expect, it } from 'vitest'
import { formatStatus, parseDiceArg, parsePlayersArg } from './helpers.js'

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

  describe('formatStatus', () => {
    it('returns empty game status when no active game', () => {
      expect(formatStatus({ hasActiveGame: false, snapshot: null, pendingRollDice: null })).toEqual(
        {
          currentPlayer: 'aucun',
          winner: 'aucun',
          activeTurn: 'aucun',
          stagedRoll: 'aucun',
          scores: ['Aucune partie active. Appuyez sur n pour commencer.'],
        }
      )
    })

    it('formats snapshot status', () => {
      const snapshot = {
        currentPlayerIndex: 1,
        winnerIndex: null,
        activeTurn: { turnScore: 200, diceToRoll: 3, canSteal: false },
        players: [
          { name: 'Alice', score: 500, failedTurnsInRow: 0 },
          { name: 'Bob', score: 1200, failedTurnsInRow: 1 },
        ],
      }

      const status = formatStatus({ hasActiveGame: true, snapshot, pendingRollDice: [1, 2, 3] })

      expect(status.currentPlayer).toBe('Bob')
      expect(status.winner).toBe('aucun')
      expect(status.stagedRoll).toBe('1,2,3')
      expect(status.activeTurn).toContain('turnScore=200')
      expect(status.scores).toEqual(['  Alice: 500 pts (fails: 0)', '> Bob: 1200 pts (fails: 1)'])
    })
  })
})
