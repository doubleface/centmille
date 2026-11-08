// @vitest-environment jsdom

import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GameScreen } from './GameScreen.jsx'

afterEach(() => {
  cleanup()
})

describe('GameScreen', () => {
  const defaultPlayers = ['Alice', 'Bob']
  const defaultPlayerStates = [
    { name: 'Alice', score: 1000, hand: ['bouclier'] },
    { name: 'Bob', score: 500, hand: [] },
  ]

  it('renders in quick-10k mode without table event banner or player hand', () => {
    render(
      <GameScreen
        players={defaultPlayers}
        playerStates={defaultPlayerStates}
        currentPlayer={defaultPlayerStates[0]}
        onRecordTurn={vi.fn()}
        onRecordBust={vi.fn()}
        onUndo={vi.fn()}
        onResetGame={vi.fn()}
      />
    )

    expect(screen.queryByTestId('table-event-banner')).toBeNull()
    expect(screen.queryByTestId('player-hand')).toBeNull()
  })

  it('renders table event banner and player hand in cent-mille mode', () => {
    const activeTableEvent = {
      name: 'Tempête',
      description: 'Collisions -2 paliers',
      remainingTurns: 3,
    }

    render(
      <GameScreen
        mode="cent-mille"
        players={defaultPlayers}
        playerStates={defaultPlayerStates}
        currentPlayer={defaultPlayerStates[0]}
        activeTableEvent={activeTableEvent}
        onRecordTurn={vi.fn()}
        onRecordBust={vi.fn()}
        onUndo={vi.fn()}
        onResetGame={vi.fn()}
      />
    )

    const banner = screen.getByTestId('table-event-banner')
    expect(banner).toBeTruthy()
    expect(banner.textContent).toContain('Tempête — Collisions -2 paliers (3 tour(s) restants)')
    expect(screen.getByTestId('player-hand')).toBeTruthy()
  })

  it('computes badges for players in cent-mille mode', () => {
    const playerStates = [
      {
        name: 'Alice',
        score: 95000,
        hand: ['bouclier', 'gel'],
        status: { frozen: true, ghost: true },
      },
      {
        name: 'Bob',
        score: 40000,
        hand: [],
        status: { cursed: true, vampire: true },
      },
    ]

    render(
      <GameScreen
        mode="cent-mille"
        players={['Alice', 'Bob']}
        playerStates={playerStates}
        currentPlayer={playerStates[0]}
        crownHolderIndex={0}
        bombState={{ holderIndex: 1, remainingTableRounds: 2 }}
        redZoneEnabled={true}
        redZoneThreshold={90000}
        onRecordTurn={vi.fn()}
        onRecordBust={vi.fn()}
        onUndo={vi.fn()}
        onResetGame={vi.fn()}
      />
    )

    // Alice has: crown 👑, frozen 🧊, ghost 👻, red-zone 🚨, hand 🃏×2
    const aliceBadges = screen.getByTestId('badges-Alice')
    expect(aliceBadges.textContent).toContain('👑')
    expect(aliceBadges.textContent).toContain('🧊')
    expect(aliceBadges.textContent).toContain('👻')
    expect(aliceBadges.textContent).toContain('🚨')
    expect(aliceBadges.textContent).toContain('🃏×2')

    // Bob has: bomb 💣2, cursed 🧿, vampire 🧛
    const bobBadges = screen.getByTestId('badges-Bob')
    expect(bobBadges.textContent).toContain('💣2')
    expect(bobBadges.textContent).toContain('🧿')
    expect(bobBadges.textContent).toContain('🧛')
  })

  it('renders collision review banner when active', () => {
    const onNextCollision = vi.fn()

    render(
      <GameScreen
        players={defaultPlayers}
        playerStates={defaultPlayerStates}
        currentPlayer={defaultPlayerStates[0]}
        onRecordTurn={vi.fn()}
        onRecordBust={vi.fn()}
        onUndo={vi.fn()}
        onResetGame={vi.fn()}
        collisionReview={{ activePlayer: 'Bob', from: 2000, to: 1000, isLast: true }}
        onNextCollision={onNextCollision}
      />
    )

    expect(screen.getByText(/Rétrogradation:/)).toBeTruthy()
    expect(screen.getByText(/2000 → 1000/)).toBeTruthy()
    expect(screen.getByText('Terminer')).toBeTruthy()
  })

  it('renders table event banner, player hand, badges and grimoire menu in dix-mille-bonus mode', () => {
    const onOpenGrimoire = vi.fn()
    const activeTableEvent = {
      name: 'Happy Hour',
      description: 'Les 5 valent 100 pts',
      remainingTurns: 2,
    }
    const playerStates = [
      {
        name: 'Alice',
        score: 9200,
        hand: ['bouclier'],
        status: { frozen: true },
      },
      {
        name: 'Bob',
        score: 5000,
        hand: ['gel'],
        status: {},
      },
    ]

    render(
      <GameScreen
        mode="dix-mille-bonus"
        players={['Alice', 'Bob']}
        playerStates={playerStates}
        currentPlayer={playerStates[0]}
        activeTableEvent={activeTableEvent}
        redZoneEnabled={true}
        redZoneThreshold={9000}
        onRecordTurn={vi.fn()}
        onRecordBust={vi.fn()}
        onUndo={vi.fn()}
        onResetGame={vi.fn()}
        onOpenGrimoire={onOpenGrimoire}
      />
    )

    // Table event banner is rendered
    const banner = screen.getByTestId('table-event-banner')
    expect(banner).toBeTruthy()
    expect(banner.textContent).toContain('Happy Hour — Les 5 valent 100 pts')

    // Player hand is rendered
    expect(screen.getByTestId('player-hand')).toBeTruthy()

    // Badges in dix-mille-bonus
    const aliceBadges = screen.getByTestId('badges-Alice')
    expect(aliceBadges.textContent).toContain('🧊')
    expect(aliceBadges.textContent).toContain('🚨')
    expect(aliceBadges.textContent).toContain('🃏×1')

    // Corner menu should have Grimoire
    const menuBtn = screen.getByLabelText('Menu de la partie')
    fireEvent.click(menuBtn)
    const grimoireItem = screen.getByTestId('menu-open-grimoire')
    expect(grimoireItem).toBeTruthy()
    fireEvent.click(grimoireItem)
    expect(onOpenGrimoire).toHaveBeenCalledTimes(1)
  })
})
