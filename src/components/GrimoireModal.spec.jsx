// @vitest-environment jsdom

import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GrimoireModal } from './GrimoireModal.jsx'

afterEach(() => {
  cleanup()
})

describe('GrimoireModal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(<GrimoireModal isOpen={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders all 4 sections with 0 discovered count when discoveredIds is empty', () => {
    const onClose = vi.fn()
    render(<GrimoireModal isOpen={true} discoveredIds={[]} onClose={onClose} />)

    expect(screen.getByTestId('grimoire-modal')).toBeTruthy()
    expect(screen.getByText(/🃏 Cartes \(0\/37\)/)).toBeTruthy()
    expect(screen.getByText(/🔮 Nombres magiques \(0\/7\)/)).toBeTruthy()
    expect(screen.getByText(/🌍 Événements de table \(0\/8\)/)).toBeTruthy()
    expect(screen.getByText(/🏆 Succès \(0\/6\)/)).toBeTruthy()

    // All items should show locked text
    const lockedElements = screen.getAllByText('❓ ???')
    expect(lockedElements.length).toBe(37 + 7 + 8 + 6)

    const closeBtn = screen.getByTestId('grimoire-close')
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalled()
  })

  it('displays full details for discovered items and leaves others locked', () => {
    const discoveredIds = [
      'card:bouclier',
      'magic:lucky-repdigit',
      'event:happy-hour',
      'achievement:coup-declat',
    ]

    render(
      <GrimoireModal
        isOpen={true}
        discoveredIds={discoveredIds}
        onClose={vi.fn()}
      />
    )

    // Counts updated
    expect(screen.getByText(/🃏 Cartes \(1\/37\)/)).toBeTruthy()
    expect(screen.getByText(/🔮 Nombres magiques \(1\/7\)/)).toBeTruthy()
    expect(screen.getByText(/🌍 Événements de table \(1\/8\)/)).toBeTruthy()
    expect(screen.getByText(/🏆 Succès \(1\/6\)/)).toBeTruthy()

    // Discovered card
    expect(screen.getByText('🛡️ Le Bouclier')).toBeTruthy()
    expect(
      screen.getByText(/Annule une chute de palier quelle qu’en soit l’origine/)
    ).toBeTruthy()

    // Discovered magic number
    expect(screen.getByText('🍀 Porte-bonheur')).toBeTruthy()
    expect(
      screen.getByText('Pioche 1 carte aléatoire (probabilités normales)')
    ).toBeTruthy()

    // Discovered event
    expect(screen.getByText('🍹 Happy Hour')).toBeTruthy()
    expect(
      screen.getByText('Les 5 valent 100 pts pendant ce tour de table !')
    ).toBeTruthy()

    // Discovered achievement
    expect(screen.getByText("Coup d'éclat")).toBeTruthy()
    expect(
      screen.getByText('Être le premier joueur de la partie à valider un tour ≥ 2 000 pts')
    ).toBeTruthy()

    // Undiscovered items still locked
    const lockedCard = screen.getByTestId('grimoire-card-doubleur')
    expect(lockedCard.textContent).toContain('❓ ???')
  })

  it('falls back to emoji if discovered card image fails to load', () => {
    const discoveredIds = ['card:bouclier']
    render(
      <GrimoireModal
        isOpen={true}
        discoveredIds={discoveredIds}
        onClose={vi.fn()}
      />
    )

    const img = screen.getByAltText('🛡️ Le Bouclier')
    expect(img).toBeTruthy()

    fireEvent.error(img)

    const fallback = screen.getByTestId('card-emoji-fallback')
    expect(fallback).toBeTruthy()
    expect(fallback.textContent).toBe('🛡️')
  })

  it('filters cards, magic numbers, table events, and achievements in dix-mille-bonus mode', () => {
    const discoveredIds = ['card:pickpocket', 'magic:exact-tier']

    render(
      <GrimoireModal
        isOpen={true}
        discoveredIds={discoveredIds}
        mode="dix-mille-bonus"
        onClose={vi.fn()}
      />
    )

    // Dix Mille Bonus has:
    // 17 deck cards + architecte = 18 cards
    expect(screen.getByText(/🃏 Cartes \(1\/18\)/)).toBeTruthy()
    // 3 magic numbers (5000, 6600, 7700)
    expect(screen.getByText(/🔮 Nombres magiques \(1\/3\)/)).toBeTruthy()
    // 6 table events
    expect(screen.getByText(/🌍 Événements de table \(0\/6\)/)).toBeTruthy()
    // 3 achievements
    expect(screen.getByText(/🏆 Succès \(0\/3\)/)).toBeTruthy()

    // Architecte card must be present because dix-mille-bonus has a tier
    expect(screen.getByTestId('grimoire-card-architecte')).toBeTruthy()

    // Cards not in deck should not be present
    expect(screen.queryByTestId('grimoire-card-aspirateur')).toBeNull()
    expect(screen.queryByTestId('grimoire-card-teleporteur')).toBeNull()

    // Discovered pickpocket shows 500 in description instead of 1 000
    expect(screen.getByText('🕵️ Le Pickpocket')).toBeTruthy()
    expect(screen.getByText(/vole 500 points au joueur actuellement en tête/i)).toBeTruthy()
    expect(screen.queryByText(/vole 1 000 points/i)).toBeNull()
  })
})
