// @vitest-environment jsdom

import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App.jsx'

const mockRecordTurn = vi.fn()
const mockRecordBust = vi.fn()
const mockUndoLastEvent = vi.fn()
const mockResetGame = vi.fn()
const mockStartGame = vi.fn()
const mockPlayCard = vi.fn()
const mockResolvePendingInteraction = vi.fn()

let activeSnapshot = null

const createDefaultSnapshot = () => ({
  mode: 'quick-10k',
  players: [
    { name: 'Alice', hasOpened: true, hand: [] },
    { name: 'Bob', hasOpened: true, hand: [] },
    { name: 'Charly', hasOpened: true, hand: [] },
  ],
  currentPlayerIndex: 0,
  winnerIndex: null,
  events: [],
  discoveredIds: [],
})

vi.mock('./hooks/useGame.js', () => ({
  useGame: () => ({
    snapshot: activeSnapshot,
    startGame: mockStartGame,
    recordTurn: mockRecordTurn,
    recordBust: mockRecordBust,
    undoLastEvent: mockUndoLastEvent,
    resetGame: mockResetGame,
    playCard: mockPlayCard,
    resolvePendingInteraction: mockResolvePendingInteraction,
  }),
}))

afterEach(() => {
  cleanup()
})

describe('App collision review', () => {
  let scrollToMock

  beforeEach(() => {
    mockRecordTurn.mockReset()
    mockRecordBust.mockReset()
    mockUndoLastEvent.mockReset()
    mockResetGame.mockReset()
    mockStartGame.mockReset()
    mockPlayCard.mockReset()
    mockResolvePendingInteraction.mockReset()

    activeSnapshot = createDefaultSnapshot()
    scrollToMock = vi.fn()
    window.HTMLElement.prototype.scrollTo = scrollToMock
  })

  it('shows downgrade steps one by one before continuing', () => {
    mockRecordTurn.mockReturnValue([
      { type: 'score', player: 'Alice', cumulative: 1500 },
      { type: 'downgrade', player: 'Bob', from: 1800, to: 1000 },
      { type: 'downgrade', player: 'Charly', from: 1200, to: 800 },
    ])

    render(<App />)

    fireEvent.change(screen.getByLabelText('Score du tour'), { target: { value: '500' } })
    fireEvent.click(screen.getByText('Valider'))

    expect(mockRecordTurn).toHaveBeenCalledWith(500)
    expect(screen.getByText(/Rétrogradation:/)).toBeTruthy()
    expect(screen.getByText(/1800 → 1000/)).toBeTruthy()

    fireEvent.click(screen.getByText('Suivant'))
    expect(screen.getByText(/1200 → 800/)).toBeTruthy()

    fireEvent.click(screen.getByText('Terminer'))
    expect(screen.queryByText(/Rétrogradation:/)).toBeNull()
    expect(scrollToMock).toHaveBeenCalled()
  })

  it('returns focus scroll to next player after collision review', () => {
    mockRecordTurn.mockReturnValue([
      { type: 'score', player: 'Alice', cumulative: 1500 },
      { type: 'downgrade', player: 'Bob', from: 1800, to: 1000 },
    ])

    render(<App />)

    fireEvent.change(screen.getByLabelText('Score du tour'), { target: { value: '500' } })
    fireEvent.click(screen.getByText('Valider'))
    const callCountDuringReview = scrollToMock.mock.calls.length

    fireEvent.click(screen.getByText('Terminer'))

    expect(scrollToMock.mock.calls.length).toBeGreaterThan(callCountDuringReview)
  })

  it('plays downgrade sound on 3-bust downgrade and handles bust/undo/reset', () => {
    const startMock = vi.fn()
    window.AudioContext = class {
      currentTime = 0
      destination = {}
      createGain() {
        return {
          gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
          connect: vi.fn(),
        }
      }
      createOscillator() {
        return {
          type: 'sine',
          frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
          connect: vi.fn(),
          start: startMock,
          stop: vi.fn(),
        }
      }
    }

    mockRecordBust.mockReturnValue([
      { type: 'bust', player: 'Alice' },
      { type: 'downgrade', player: 'Alice', from: 1000, to: 500 },
    ])

    render(<App />)

    fireEvent.click(screen.getByText('Échec'))
    expect(mockRecordBust).toHaveBeenCalled()
    expect(startMock).toHaveBeenCalledTimes(8)

    fireEvent.click(screen.getByLabelText('Menu de la partie'))
    fireEvent.click(screen.getByText('Annuler le dernier tour'))
    expect(mockUndoLastEvent).toHaveBeenCalled()

    fireEvent.click(screen.getByLabelText('Menu de la partie'))
    fireEvent.click(screen.getByText('Recommencer la partie'))
    fireEvent.click(screen.getByText('Confirmer'))
    expect(mockResetGame).toHaveBeenCalled()

    delete window.AudioContext
  })
})

describe('App Cent Mille integration', () => {
  beforeEach(() => {
    mockRecordTurn.mockReset()
    mockRecordBust.mockReset()
    mockUndoLastEvent.mockReset()
    mockResetGame.mockReset()
    mockStartGame.mockReset()
    mockPlayCard.mockReset()
    mockResolvePendingInteraction.mockReset()
  })

  it('starts a quick-10k game by default from SetupScreen without options', () => {
    activeSnapshot = null // Show SetupScreen

    render(<App />)

    expect(screen.getByText('Nouvelle partie')).toBeTruthy()
    fireEvent.click(screen.getByText('Commencer la partie'))

    expect(mockStartGame).toHaveBeenCalledWith(['Joueur 1', 'Joueur 2'])
  })

  it('renders winner banner when winner is present', () => {
    activeSnapshot = {
      mode: 'quick-10k',
      players: [
        { name: 'Alice', score: 10000, hasOpened: true, hand: [] },
        { name: 'Bob', score: 8000, hasOpened: true, hand: [] },
      ],
      currentPlayerIndex: 0,
      winnerIndex: 0,
      events: [],
    }

    render(<App />)
    expect(screen.getByText(/a gagné la partie/)).toBeTruthy()
    expect(screen.getByRole('complementary').textContent).toContain('Alice')
  })

  it('starts a Cent Mille game from SetupScreen with custom options', () => {
    activeSnapshot = null // Show SetupScreen

    render(<App />)

    expect(screen.getByText('Nouvelle partie')).toBeTruthy()
    fireEvent.click(screen.getByTestId('mode-cent-mille'))

    expect(screen.getByTestId('toggle-red-zone')).toBeTruthy()
    expect(screen.getByTestId('toggle-shop')).toBeTruthy()

    fireEvent.click(screen.getByTestId('toggle-red-zone')) // toggle off
    fireEvent.click(screen.getByText('Commencer la partie'))

    expect(mockStartGame).toHaveBeenCalledWith(
      ['Joueur 1', 'Joueur 2'],
      { mode: 'cent-mille', redZoneEnabled: false, shopEnabled: true }
    )
  })

  it('plays a card, shows reveal modal with cardFlip, and dismisses it', () => {
    activeSnapshot = {
      mode: 'cent-mille',
      players: [
        { name: 'Alice', score: 2000, hasOpened: true, hand: ['doubleur'] },
        { name: 'Bob', score: 1000, hasOpened: true, hand: [] },
      ],
      currentPlayerIndex: 0,
      winnerIndex: null,
      events: [],
      discoveredIds: [],
    }

    mockPlayCard.mockReturnValue([
      {
        type: 'card-played',
        player: 'Alice',
        cardId: 'doubleur',
        soundId: 'rarity-rare',
      },
    ])

    render(<App />)

    // Player hand renders doubleur card
    expect(screen.getByTestId('player-hand')).toBeTruthy()
    fireEvent.click(screen.getByTestId('hand-card-doubleur-0'))

    // Action panel opens
    expect(screen.getByTestId('card-action-panel')).toBeTruthy()
    fireEvent.click(screen.getByTestId('play-card-button'))

    expect(mockPlayCard).toHaveBeenCalledWith('doubleur', {})

    // Reveal modal is displayed
    expect(screen.getByTestId('reveal-modal')).toBeTruthy()
    expect(screen.getByTestId('reveal-title').textContent).toContain('Alice joue ✖️2 Le Doubleur')

    // Dismiss reveal modal
    fireEvent.click(screen.getByTestId('reveal-dismiss'))
    expect(screen.queryByTestId('reveal-modal')).toBeNull()
  })

  it('opens and closes Grimoire from corner menu in Cent Mille mode', () => {
    activeSnapshot = {
      mode: 'cent-mille',
      players: [
        { name: 'Alice', score: 2000, hasOpened: true, hand: [] },
        { name: 'Bob', score: 1000, hasOpened: true, hand: [] },
      ],
      currentPlayerIndex: 0,
      winnerIndex: null,
      events: [],
      discoveredIds: ['card:bouclier'],
    }

    render(<App />)

    fireEvent.click(screen.getByLabelText('Menu de la partie'))
    const grimoireBtn = screen.getByTestId('menu-open-grimoire')
    expect(grimoireBtn).toBeTruthy()

    fireEvent.click(grimoireBtn)
    expect(screen.getByTestId('grimoire-modal')).toBeTruthy()

    // Close Grimoire
    fireEvent.click(screen.getByTestId('grimoire-close'))
    expect(screen.queryByTestId('grimoire-modal')).toBeNull()
  })

  it('handles pending interaction when revealQueue is empty', () => {
    activeSnapshot = {
      mode: 'cent-mille',
      players: [
        { name: 'Alice', score: 20000, hasOpened: true, hand: [] },
        { name: 'Bob', score: 5000, hasOpened: true, hand: [] },
      ],
      currentPlayerIndex: 0,
      winnerIndex: null,
      events: [],
      discoveredIds: [],
      pendingInteraction: {
        type: 'architect',
        tier: 20000,
        architectPlayerIndex: 0,
        recipientPlayerIndex: 1,
        choices: ['bouclier', 'gel', 'bombe'],
      },
    }

    mockResolvePendingInteraction.mockReturnValue([])

    render(<App />)

    expect(screen.getByTestId('reveal-modal')).toBeTruthy()
    expect(screen.getByText("🏗️ Privilège de l'Architecte")).toBeTruthy()

    fireEvent.click(screen.getByTestId('choice-bouclier'))
    expect(mockResolvePendingInteraction).toHaveBeenCalledWith({ cardId: 'bouclier' })
  })

  it('toggles sound mute via corner menu', () => {
    activeSnapshot = {
      mode: 'cent-mille',
      players: [
        { name: 'Alice', score: 500, hasOpened: true, hand: [] },
        { name: 'Bob', score: 500, hasOpened: true, hand: [] },
      ],
      currentPlayerIndex: 0,
      winnerIndex: null,
      events: [],
    }

    render(<App />)

    fireEvent.click(screen.getByLabelText('Menu de la partie'))
    const toggleBtn = screen.getByTestId('menu-toggle-mute')
    expect(toggleBtn).toBeTruthy()
    fireEvent.click(toggleBtn)
  })

  it('displays error message when recordTurn throws', () => {
    activeSnapshot = {
      mode: 'cent-mille',
      players: [
        { name: 'Alice', score: 500, hasOpened: true, hand: [] },
        { name: 'Bob', score: 500, hasOpened: true, hand: [] },
      ],
      currentPlayerIndex: 0,
      winnerIndex: null,
      events: [],
    }

    mockRecordTurn.mockImplementation(() => {
      throw new Error('Score invalide')
    })

    render(<App />)

    fireEvent.change(screen.getByLabelText('Score du tour'), { target: { value: '500' } })
    fireEvent.click(screen.getByText('Valider'))

    expect(screen.getByText('Score invalide')).toBeTruthy()
  })

  it('handles errors in recordBust, playCard, resolvePendingInteraction, undo, and resetGame', () => {
    activeSnapshot = {
      mode: 'cent-mille',
      players: [
        { name: 'Alice', score: 500, hasOpened: true, hand: ['doubleur'] },
        { name: 'Bob', score: 500, hasOpened: true, hand: [] },
      ],
      currentPlayerIndex: 0,
      winnerIndex: null,
      events: [],
      pendingInteraction: { type: 'answer-42', choices: ['bouclier', 'gel'] },
    }

    mockRecordBust.mockImplementation(() => {
      throw new Error('Erreur bust')
    })
    mockPlayCard.mockImplementation(() => {
      throw new Error('Erreur playCard')
    })
    mockResolvePendingInteraction.mockImplementation(() => {
      throw new Error('Erreur interaction')
    })
    mockUndoLastEvent.mockImplementation(() => {
      throw new Error('Erreur undo')
    })
    mockResetGame.mockImplementation(() => {
      throw new Error('Erreur reset')
    })

    render(<App />)

    fireEvent.click(screen.getByText('Échec'))
    expect(screen.getByText('Erreur bust')).toBeTruthy()

    fireEvent.click(screen.getByTestId('hand-card-doubleur-0'))
    fireEvent.click(screen.getByTestId('play-card-button'))
    expect(screen.getByText('Erreur playCard')).toBeTruthy()

    fireEvent.click(screen.getByTestId('choice-bouclier'))
    expect(screen.getByText('Erreur interaction')).toBeTruthy()

    fireEvent.click(screen.getByLabelText('Menu de la partie'))
    fireEvent.click(screen.getByText('Annuler le dernier tour'))
    expect(screen.getByText('Erreur undo')).toBeTruthy()

    fireEvent.click(screen.getByLabelText('Menu de la partie'))
    fireEvent.click(screen.getByText('Recommencer la partie'))
    fireEvent.click(screen.getByText('Confirmer'))
    expect(screen.getByText('Erreur reset')).toBeTruthy()
  })

  it('starts a Dix Mille Bonus game from SetupScreen and shows filtered Grimoire & redZone at 9000', () => {
    activeSnapshot = null

    const { rerender } = render(<App />)

    fireEvent.click(screen.getByTestId('mode-dix-mille-bonus'))
    fireEvent.click(screen.getByText('Commencer la partie'))

    expect(mockStartGame).toHaveBeenCalledWith(['Joueur 1', 'Joueur 2'], {
      mode: 'dix-mille-bonus',
    })

    // Now active snapshot in dix-mille-bonus
    activeSnapshot = {
      mode: 'dix-mille-bonus',
      players: [
        { name: 'Alice', score: 9100, hasOpened: true, hand: ['pickpocket'] },
        { name: 'Bob', score: 1000, hasOpened: true, hand: [] },
      ],
      currentPlayerIndex: 0,
      winnerIndex: null,
      events: [],
      discoveredIds: ['card:pickpocket'],
      redZoneEnabled: true,
      // redZoneThreshold not specified in snapshot -> fallback from resolveGameMode should be 9000
    }

    rerender(<App />)

    // Alice has score 9100 >= 9000 -> red-zone badge
    const aliceBadges = screen.getByTestId('badges-Alice')
    expect(aliceBadges.textContent).toContain('🚨')

    // Open Grimoire
    fireEvent.click(screen.getByLabelText('Menu de la partie'))
    const grimoireBtn = screen.getByTestId('menu-open-grimoire')
    expect(grimoireBtn).toBeTruthy()
    fireEvent.click(grimoireBtn)

    // Filtered count for dix-mille-bonus
    expect(screen.getByText(/🃏 Cartes \(1\/18\)/)).toBeTruthy()
    expect(screen.getByText(/🔮 Nombres magiques \(0\/3\)/)).toBeTruthy()
  })
})
