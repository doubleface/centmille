// @vitest-environment jsdom

import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlayerHand } from './PlayerHand.jsx'

afterEach(() => {
  cleanup()
})

describe('PlayerHand', () => {
  const dummyPlayers = [
    { name: 'Alice', score: 1000 },
    { name: 'Bob', score: 2000 },
    { name: 'Charlie', score: 3000 },
  ]

  it('renders empty hand message when player has no cards', () => {
    render(<PlayerHand player={{ hand: [] }} />)
    expect(screen.getByTestId('player-hand-empty')).toBeTruthy()
    expect(screen.getByText('Aucune carte en main')).toBeTruthy()
  })

  it('renders cards in player hand with thumbnail, rarity class, name and short description', () => {
    const player = {
      name: 'Alice',
      hand: ['arrondi', 'doubleur', 'cameleon'],
    }
    render(<PlayerHand player={player} />)

    const card1 = screen.getByTestId('hand-card-arrondi-0')
    const card2 = screen.getByTestId('hand-card-doubleur-1')
    const card3 = screen.getByTestId('hand-card-cameleon-2')

    expect(card1.className).toContain('card-tile--common')
    expect(card2.className).toContain('card-tile--rare')
    expect(card3.className).toContain('card-tile--legendary')

    expect(screen.getByText("🔼 L'Arrondi")).toBeTruthy()
    expect(screen.getByText('✖️2 Le Doubleur')).toBeTruthy()
    expect(screen.getByText('🦎 Le Caméléon')).toBeTruthy()

    expect(
      screen.getByText('En voyant vos dés : arrondit votre score à la centaine supérieure.')
    ).toBeTruthy()
  })

  it('falls back to emoji if card thumbnail fails to load', () => {
    const player = {
      name: 'Alice',
      hand: ['arrondi'],
    }
    render(<PlayerHand player={player} />)

    const img = screen.getByAltText("🔼 L'Arrondi")
    expect(img).toBeTruthy()

    fireEvent.error(img)

    const fallback = screen.getByTestId('card-emoji-fallback')
    expect(fallback).toBeTruthy()
    expect(fallback.textContent).toBe('🔼')
  })

  it('renders active turn modifiers badges', () => {
    const activeTurnModifiers = {
      arrondi: true,
      doubleur: true,
      sniper: true,
      assurance: true,
      toutOuRien: true,
      contratTarget: 700,
      declarativeCards: ['sixieme-sens'],
    }
    render(
      <PlayerHand
        player={{ hand: [] }}
        activeTurnModifiers={activeTurnModifiers}
      />
    )

    expect(screen.getByTestId('active-turn-modifiers')).toBeTruthy()
    expect(screen.getByText("🔼 L'Arrondi")).toBeTruthy()
    expect(screen.getByText('✖️2 Doubleur')).toBeTruthy()
    expect(screen.getByText('🎯 Sniper')).toBeTruthy()
    expect(screen.getByText('☂️ Assurance')).toBeTruthy()
    expect(screen.getByText('💥 Tout ou Rien')).toBeTruthy()
    expect(screen.getByText('📜 Contrat (700 pts)')).toBeTruthy()
    expect(screen.getByText('🎲 Le Sixième Sens')).toBeTruthy()
  })

  it('opens and closes inline action panel on card click', () => {
    const player = {
      name: 'Alice',
      hand: ['arrondi'],
    }
    render(<PlayerHand player={player} />)

    const card = screen.getByTestId('hand-card-arrondi-0')
    fireEvent.click(card)

    expect(screen.getByTestId('card-action-panel')).toBeTruthy()
    expect(
      screen.getByText(/Autorise exceptionnellement un score non-multiple de 100/)
    ).toBeTruthy()

    // Clicking again closes panel
    fireEvent.click(card)
    expect(screen.queryByTestId('card-action-panel')).toBeNull()

    // Re-open and close with close button
    fireEvent.click(card)
    expect(screen.getByTestId('card-action-panel')).toBeTruthy()
    fireEvent.click(screen.getByTestId('card-action-close'))
    expect(screen.queryByTestId('card-action-panel')).toBeNull()
  })

  it('displays note without play button for passive-prompt cards (e.g. Bouclier)', () => {
    const player = {
      name: 'Alice',
      hand: ['bouclier'],
    }
    render(<PlayerHand player={player} />)

    fireEvent.click(screen.getByTestId('hand-card-bouclier-0'))
    expect(screen.getByTestId('passive-prompt-note')).toBeTruthy()
    expect(
      screen.getByText("S'active automatiquement en réaction")
    ).toBeTruthy()
    expect(screen.queryByTestId('play-card-button')).toBeNull()
  })

  it('supports instant-target cards and target player selector', () => {
    const onPlayCard = vi.fn()
    const player = {
      name: 'Alice',
      hand: ['gel'],
    }
    render(
      <PlayerHand
        player={player}
        players={dummyPlayers}
        currentPlayerIndex={0}
        onPlayCard={onPlayCard}
      />
    )

    fireEvent.click(screen.getByTestId('hand-card-gel-0'))

    const select = screen.getByTestId('target-player-select')
    expect(select).toBeTruthy()
    // Should contain Bob (1) and Charlie (2), but not Alice (0)
    expect(screen.getByText('Bob')).toBeTruthy()
    expect(screen.getByText('Charlie')).toBeTruthy()
    expect(screen.queryByRole('option', { name: 'Alice' })).toBeNull()

    fireEvent.change(select, { target: { value: '2' } })
    fireEvent.click(screen.getByTestId('play-card-button'))

    expect(onPlayCard).toHaveBeenCalledWith('gel', {
      targetIndex: 2,
      refuseGage: false,
    })
  })

  it('supports main-faible card and refuseGage checkbox', () => {
    const onPlayCard = vi.fn()
    const player = {
      name: 'Alice',
      hand: ['main-faible'],
    }
    render(
      <PlayerHand
        player={player}
        players={dummyPlayers}
        currentPlayerIndex={0}
        onPlayCard={onPlayCard}
      />
    )

    fireEvent.click(screen.getByTestId('hand-card-main-faible-0'))
    const checkbox = screen.getByTestId('refuse-gage-checkbox')
    expect(checkbox.checked).toBe(false)

    fireEvent.click(checkbox)
    expect(checkbox.checked).toBe(true)

    fireEvent.click(screen.getByTestId('play-card-button'))
    expect(onPlayCard).toHaveBeenCalledWith('main-faible', {
      targetIndex: 1, // Bob by default
      refuseGage: true,
    })
  })

  it('supports contrat card with number input validation', () => {
    const onPlayCard = vi.fn()
    const player = {
      name: 'Alice',
      hand: ['contrat'],
    }
    render(<PlayerHand player={player} onPlayCard={onPlayCard} />)

    fireEvent.click(screen.getByTestId('hand-card-contrat-0'))
    const input = screen.getByTestId('contrat-target-input')
    const playBtn = screen.getByTestId('play-card-button')

    expect(input.value).toBe('500')
    expect(playBtn.disabled).toBe(false)

    // Test invalid values
    fireEvent.change(input, { target: { value: '250' } })
    expect(playBtn.disabled).toBe(true)

    fireEvent.change(input, { target: { value: '350' } })
    expect(playBtn.disabled).toBe(true)

    fireEvent.change(input, { target: { value: '800' } })
    expect(playBtn.disabled).toBe(false)

    fireEvent.click(playBtn)
    expect(onPlayCard).toHaveBeenCalledWith('contrat', {
      targetScore: 800,
    })
  })

  it('supports standard pre-turn and instant-self cards', () => {
    const onPlayCard = vi.fn()
    const player = {
      name: 'Alice',
      hand: ['doubleur'],
    }
    render(<PlayerHand player={player} onPlayCard={onPlayCard} />)

    fireEvent.click(screen.getByTestId('hand-card-doubleur-0'))
    fireEvent.click(screen.getByTestId('play-card-button'))

    expect(onPlayCard).toHaveBeenCalledWith('doubleur', {})
  })

  it('disables play button when disabled prop is true', () => {
    const onPlayCard = vi.fn()
    const player = {
      name: 'Alice',
      hand: ['doubleur'],
    }
    render(<PlayerHand player={player} disabled={true} onPlayCard={onPlayCard} />)

    fireEvent.click(screen.getByTestId('hand-card-doubleur-0'))
    const btn = screen.getByTestId('play-card-button')
    expect(btn.disabled).toBe(true)
    fireEvent.click(btn)
    expect(onPlayCard).not.toHaveBeenCalled()
  })

  it('disables offensive cards when player is in red zone', () => {
    const player = {
      name: 'Alice',
      score: 92000,
      hand: ['gel', 'effaceur'],
    }
    render(
      <PlayerHand
        player={player}
        players={dummyPlayers}
        currentPlayerIndex={0}
        redZoneThreshold={90000}
        redZoneEnabled={true}
      />
    )

    // Gel is offensive
    fireEvent.click(screen.getByTestId('hand-card-gel-0'))
    expect(screen.getByTestId('play-card-button').disabled).toBe(true)

    // Effaceur is not offensive
    fireEvent.click(screen.getByTestId('hand-card-effaceur-1'))
    expect(screen.getByTestId('play-card-button').disabled).toBe(false)
  })

  it('disables aspirateur if last turn was not a bust', () => {
    const player = {
      name: 'Alice',
      hand: ['aspirateur'],
    }
    const { rerender } = render(
      <PlayerHand player={player} lastTurnWasBust={false} />
    )

    fireEvent.click(screen.getByTestId('hand-card-aspirateur-0'))
    expect(screen.getByTestId('play-card-button').disabled).toBe(true)

    rerender(<PlayerHand player={player} lastTurnWasBust={true} />)
    expect(screen.getByTestId('play-card-button').disabled).toBe(false)
  })

  it('disables echo if no card has been played yet', () => {
    const player = {
      name: 'Alice',
      hand: ['echo'],
    }
    const { rerender } = render(
      <PlayerHand player={player} lastPlayedCardId={null} />
    )

    fireEvent.click(screen.getByTestId('hand-card-echo-0'))
    expect(screen.getByTestId('play-card-button').disabled).toBe(true)

    rerender(<PlayerHand player={player} lastPlayedCardId="doubleur" />)
    expect(screen.getByTestId('play-card-button').disabled).toBe(false)
  })

  it('disables instant-target when no opponents exist', () => {
    const player = {
      name: 'Alice',
      hand: ['gel'],
    }
    render(
      <PlayerHand
        player={player}
        players={[{ name: 'Alice', score: 1000 }]}
        currentPlayerIndex={0}
      />
    )

    fireEvent.click(screen.getByTestId('hand-card-gel-0'))
    expect(screen.getByTestId('play-card-button').disabled).toBe(true)
  })

  it('gracefully handles missing player prop and unknown modifier card', () => {
    render(
      <PlayerHand
        activeTurnModifiers={{ declarativeCards: ['custom-rule'] }}
      />
    )
    expect(screen.getByTestId('modifier-decl-custom-rule')).toBeTruthy()
    expect(screen.getByText('custom-rule')).toBeTruthy()
  })

  it('gracefully ignores unknown card ids in hand', () => {
    const player = {
      name: 'Alice',
      hand: ['unknown-card-id'],
    }
    render(<PlayerHand player={player} />)
    expect(screen.queryByTestId('hand-card-unknown-card-id-0')).toBeNull()
  })

  it('displays pickpocket descriptions with 500 points in dix-mille-bonus mode', () => {
    const player = {
      name: 'Alice',
      hand: ['pickpocket'],
    }
    render(
      <PlayerHand
        player={player}
        mode="dix-mille-bonus"
        players={dummyPlayers}
        currentPlayerIndex={0}
      />
    )

    // Short description on tile
    expect(
      screen.getByText('Pendant votre tour : vole 500 pts au leader actuel.')
    ).toBeTruthy()

    // Open action panel for full description
    fireEvent.click(screen.getByTestId('hand-card-pickpocket-0'))
    expect(
      screen.getByText(/vole 500 points au joueur actuellement en tête \(si ce leader a au moins 500 points/)
    ).toBeTruthy()
  })

  it('checks pickpocket eligibility according to mode pickpocketAmount', () => {
    const onPlayCard = vi.fn()
    const player = {
      name: 'Alice',
      hand: ['pickpocket'],
    }

    // Opponent has 600 points: eligible in dix-mille-bonus (amount 500), but not in cent-mille (amount 1000)
    const playersWith600 = [
      { name: 'Alice', score: 0 },
      { name: 'Bob', score: 600 },
    ]

    const { rerender } = render(
      <PlayerHand
        player={player}
        players={playersWith600}
        currentPlayerIndex={0}
        mode="cent-mille"
        onPlayCard={onPlayCard}
      />
    )

    fireEvent.click(screen.getByTestId('hand-card-pickpocket-0'))
    expect(screen.getByTestId('play-card-button').disabled).toBe(true)

    // Switch to dix-mille-bonus: 600 >= 500 so play button should be enabled
    rerender(
      <PlayerHand
        player={player}
        players={playersWith600}
        currentPlayerIndex={0}
        mode="dix-mille-bonus"
        onPlayCard={onPlayCard}
      />
    )

    expect(screen.getByTestId('play-card-button').disabled).toBe(false)
    fireEvent.click(screen.getByTestId('play-card-button'))
    expect(onPlayCard).toHaveBeenCalledWith('pickpocket', {})

    // When opponent has 400 in dix-mille-bonus (< 500), disabled
    rerender(
      <PlayerHand
        player={player}
        players={[
          { name: 'Alice', score: 0 },
          { name: 'Bob', score: 400 },
        ]}
        currentPlayerIndex={0}
        mode="dix-mille-bonus"
        onPlayCard={onPlayCard}
      />
    )
    fireEvent.click(screen.getByTestId('hand-card-pickpocket-0'))
    expect(screen.getByTestId('play-card-button').disabled).toBe(true)
  })
})
