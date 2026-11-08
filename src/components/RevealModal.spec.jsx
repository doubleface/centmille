// @vitest-environment jsdom

import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RevealModal } from './RevealModal.jsx'

afterEach(() => {
  cleanup()
})

describe('RevealModal', () => {
  const dummyPlayers = [
    { name: 'Alice', score: 3500 },
    { name: 'Bob', score: 1500 },
    { name: 'Charlie', score: 500 },
  ]

  it('renders nothing when neither revealEvent nor pendingInteraction is provided', () => {
    const { container } = render(<RevealModal />)
    expect(container.firstChild).toBeNull()
  })

  describe('Priority 1: revealEvent', () => {
    it('renders card-drawn event with firstDiscovery badge, image, and dismiss button', () => {
      const onDismissReveal = vi.fn()
      const revealEvent = {
        type: 'card-drawn',
        player: 'Alice',
        cardId: 'bouclier',
        firstDiscovery: true,
      }

      render(
        <RevealModal
          revealEvent={revealEvent}
          onDismissReveal={onDismissReveal}
        />
      )

      expect(screen.getByTestId('reveal-modal')).toBeTruthy()
      expect(screen.getByTestId('reveal-discovery-badge')).toBeTruthy()
      expect(screen.getByText(/Alice pioche 🛡️ Le Bouclier/)).toBeTruthy()
      expect(screen.getByText(/Annule une chute de palier/)).toBeTruthy()

      const dismissBtn = screen.getByTestId('reveal-dismiss')
      fireEvent.click(dismissBtn)
      expect(onDismissReveal).toHaveBeenCalled()
    })

    it('falls back to emoji if thumbnail fails to load', () => {
      const revealEvent = {
        type: 'card-drawn',
        player: 'Alice',
        cardId: 'bouclier',
      }
      render(<RevealModal revealEvent={revealEvent} />)

      const img = screen.getByAltText('🛡️ Le Bouclier')
      fireEvent.error(img)

      const emoji = screen.getByTestId('card-emoji-fallback')
      expect(emoji.textContent).toBe('🛡️')
    })

    it('renders card-played event', () => {
      const revealEvent = {
        type: 'card-played',
        player: 'Bob',
        cardId: 'arrondi',
      }
      render(<RevealModal revealEvent={revealEvent} />)

      expect(screen.getByText(/Bob joue 🔼 L'Arrondi/)).toBeTruthy()
      expect(
        screen.getByText(/Autorise exceptionnellement un score non-multiple de 100/)
      ).toBeTruthy()
    })

    it('renders boomerang event', () => {
      const revealEvent = {
        type: 'boomerang',
        player: 'Alice',
        attacker: 'Bob',
        cardId: 'gel',
      }
      render(<RevealModal revealEvent={revealEvent} />)

      expect(screen.getByText('🪃 Boomerang !')).toBeTruthy()
      expect(
        screen.getByText(/L'effet de « 🧊 Le Gel » est renvoyé directement sur son lanceur Bob !/)
      ).toBeTruthy()
    })

    it('renders magic-number event', () => {
      const revealEvent = {
        type: 'magic-number',
        player: 'Alice',
        magicId: 'devil',
        name: '😈 Le Diable',
      }
      render(<RevealModal revealEvent={revealEvent} />)

      expect(screen.getByText('🔮 😈 Le Diable')).toBeTruthy()
      expect(screen.getByText(/Alice a atteint un nombre magique/)).toBeTruthy()
    })

    it('renders table-event', () => {
      const revealEvent = {
        type: 'table-event',
        eventId: 'tempete',
        name: '🌪️ Tempête',
        description: 'Toutes les collisions font chuter de 2 paliers au lieu d’un.',
      }
      render(<RevealModal revealEvent={revealEvent} />)

      expect(screen.getByText('🌍 🌪️ Tempête')).toBeTruthy()
      expect(
        screen.getByText('Toutes les collisions font chuter de 2 paliers au lieu d’un.')
      ).toBeTruthy()
    })

    it('renders achievement event', () => {
      const revealEvent = {
        type: 'achievement',
        player: 'Alice',
        achievementId: 'coup-declat',
        name: "Coup d'éclat",
      }
      render(<RevealModal revealEvent={revealEvent} />)

      expect(screen.getByText("🏆 Succès : Coup d'éclat")).toBeTruthy()
      expect(screen.getByText(/Alice débloque le succès/)).toBeTruthy()
    })

    it('renders consolation event', () => {
      const revealEvent = {
        type: 'consolation',
        player: 'Bob',
        cardId: 'arrondi',
      }
      render(<RevealModal revealEvent={revealEvent} />)

      expect(screen.getByText('🩹 Consolation pour Bob')).toBeTruthy()
      expect(
        screen.getByText(/Après cette chute difficile, Bob reçoit une carte de consolation : 🔼 L'Arrondi/)
      ).toBeTruthy()
    })

    it('renders bounty-claimed event', () => {
      const revealEvent = {
        type: 'bounty-claimed',
        hunter: 'Alice',
        leader: 'Bob',
      }
      render(<RevealModal revealEvent={revealEvent} />)

      expect(screen.getByText('👑 Prime de la Couronne !')).toBeTruthy()
      expect(
        screen.getByText(/Alice a fait chuter le porteur de la couronne \(Bob\)/)
      ).toBeTruthy()
    })

    it('renders crown-changed event', () => {
      const revealEvent = {
        type: 'crown-changed',
        player: 'Alice',
      }
      render(<RevealModal revealEvent={revealEvent} />)

      expect(screen.getByText('👑 Nouveau Roi : Alice !')).toBeTruthy()
      expect(screen.getByText(/Alice prend la tête de la partie et porte la Couronne/)).toBeTruthy()
    })

    it('renders red-zone event', () => {
      const revealEvent = {
        type: 'red-zone',
        player: 'Alice',
      }
      render(<RevealModal revealEvent={revealEvent} />)

      expect(screen.getByText('🚨 Zone Rouge !')).toBeTruthy()
      expect(screen.getByText(/Alice a franchi les 90 000 points/)).toBeTruthy()
      expect(screen.getByText(/les adversaires préparent leur sabotage !/)).toBeTruthy()
    })

    it('renders red-zone event with custom threshold and sabotage disabled (dix-mille-bonus)', () => {
      const revealEvent = {
        type: 'red-zone',
        player: 'Bob',
        threshold: 9000,
        sabotage: false,
      }
      render(<RevealModal revealEvent={revealEvent} mode="dix-mille-bonus" />)

      expect(screen.getByText('🚨 Zone Rouge !')).toBeTruthy()
      expect(
        screen.getByText(
          /Bob a franchi les 9[\s\u202f]000 points et entre dans la Zone Rouge ! Les cartes offensives lui sont interdites !/
        )
      ).toBeTruthy()
      expect(screen.queryByText(/sabotage/i)).toBeNull()
    })

    it('displays pickpocket descriptions with 500 points in dix-mille-bonus mode', () => {
      const revealEvent = {
        type: 'card-drawn',
        player: 'Alice',
        cardId: 'pickpocket',
      }
      render(<RevealModal revealEvent={revealEvent} mode="dix-mille-bonus" />)

      expect(screen.getByText(/Alice pioche 🕵️ Le Pickpocket/)).toBeTruthy()
      expect(screen.getByText(/vole 500 points au joueur actuellement en tête/i)).toBeTruthy()
      expect(screen.queryByText(/vole 1 000 points/i)).toBeNull()
    })

    it('renders bomb-exploded event', () => {
      const revealEvent = {
        type: 'bomb-exploded',
        player: 'Bob',
        from: 25000,
        to: 20000,
      }
      render(<RevealModal revealEvent={revealEvent} />)

      expect(screen.getByText('💣 BOOM ! La Bombe a explosé !')).toBeTruthy()
      expect(screen.getByText(/chute de 25000 à 20000 points/)).toBeTruthy()
    })

    it('renders pandora-curse event', () => {
      const revealEvent = {
        type: 'pandora-curse',
        player: 'Bob',
      }
      render(<RevealModal revealEvent={revealEvent} />)

      expect(screen.getByText('📦 Malédiction de Pandore !')).toBeTruthy()
      expect(screen.getByText(/statut Malédiction pour son prochain tour/)).toBeTruthy()
    })

    it('renders fallback for custom/unknown event type', () => {
      const revealEvent = {
        type: 'mystery-event',
        name: 'Mystère',
        description: 'Effet mystérieux',
      }
      render(<RevealModal revealEvent={revealEvent} />)

      expect(screen.getByText('Mystère')).toBeTruthy()
      expect(screen.getByText('Effet mystérieux')).toBeTruthy()
    })
  })

  describe('Priority 2: pendingInteraction', () => {
    it('prioritizes revealEvent over pendingInteraction if both are present', () => {
      const revealEvent = {
        type: 'card-drawn',
        player: 'Alice',
        cardId: 'bouclier',
      }
      const pendingInteraction = {
        type: 'answer-42',
        choices: ['doubleur', 'gel'],
      }

      render(
        <RevealModal
          revealEvent={revealEvent}
          pendingInteraction={pendingInteraction}
        />
      )

      expect(screen.getByText(/Alice pioche 🛡️ Le Bouclier/)).toBeTruthy()
      expect(screen.queryByText(/La Grande Réponse/)).toBeNull()
    })

    it('handles architect interaction', () => {
      const onResolveInteraction = vi.fn()
      const pendingInteraction = {
        type: 'architect',
        architectPlayerIndex: 0,
        recipientPlayerIndex: 2,
        choices: ['bouclier', 'gel', 'doubleur'],
      }

      render(
        <RevealModal
          pendingInteraction={pendingInteraction}
          players={dummyPlayers}
          onResolveInteraction={onResolveInteraction}
        />
      )

      expect(screen.getByText("🏗️ Privilège de l'Architecte")).toBeTruthy()
      expect(
        screen.getByText(/Alice \(Architecte\) choisit 1 des 3 cartes à offrir à Charlie \(Dernier\)/)
      ).toBeTruthy()

      const choiceBtn = screen.getByTestId('choice-bouclier')
      fireEvent.click(choiceBtn)
      expect(onResolveInteraction).toHaveBeenCalledWith({ cardId: 'bouclier' })
    })

    it('handles answer-42 interaction', () => {
      const onResolveInteraction = vi.fn()
      const pendingInteraction = {
        type: 'answer-42',
        choices: ['doubleur', 'gel'],
      }

      render(
        <RevealModal
          pendingInteraction={pendingInteraction}
          onResolveInteraction={onResolveInteraction}
        />
      )

      expect(screen.getByText('🌌 La Grande Réponse (42 000)')).toBeTruthy()

      const choiceBtn = screen.getByTestId('choice-doubleur')
      fireEvent.click(choiceBtn)
      expect(onResolveInteraction).toHaveBeenCalledWith({ cardId: 'doubleur' })
    })

    it('handles hand-overflow interaction', () => {
      const onResolveInteraction = vi.fn()
      const pendingInteraction = {
        type: 'hand-overflow',
        choices: ['arrondi', 'doubleur', 'gel', 'bouclier'],
      }

      render(
        <RevealModal
          pendingInteraction={pendingInteraction}
          onResolveInteraction={onResolveInteraction}
        />
      )

      expect(screen.getByText('✋ Main pleine')).toBeTruthy()
      expect(
        screen.getByText(/Main pleine \(max 3 cartes\) : choisissez quelle carte défausser/)
      ).toBeTruthy()

      const discardBtn = screen.getByTestId('discard-arrondi')
      fireEvent.click(discardBtn)
      expect(onResolveInteraction).toHaveBeenCalledWith({
        discardedCardId: 'arrondi',
      })
    })

    it('adapts hand-overflow description to handLimit in dix-mille-bonus mode', () => {
      const pendingInteraction = {
        type: 'hand-overflow',
        choices: ['arrondi', 'doubleur', 'gel'],
      }

      render(
        <RevealModal
          pendingInteraction={pendingInteraction}
          mode="dix-mille-bonus"
        />
      )

      expect(screen.getByText('✋ Main pleine')).toBeTruthy()
      expect(
        screen.getByText(/Main pleine \(max 2 cartes\) : choisissez quelle carte défausser/)
      ).toBeTruthy()
    })

    it('handles defensive-reaction interaction with choice or skip', () => {
      const onResolveInteraction = vi.fn()
      const pendingInteraction = {
        type: 'defensive-reaction',
        victimIndex: 1,
        from: 20000,
        to: 18000,
        availableCards: ['bouclier', 'parachute'],
      }

      const { rerender } = render(
        <RevealModal
          pendingInteraction={pendingInteraction}
          players={dummyPlayers}
          onResolveInteraction={onResolveInteraction}
        />
      )

      expect(screen.getByText('🛡️ Réaction défensive')).toBeTruthy()
      expect(screen.getByText(/Bob chute de 20000 à 18000 points/)).toBeTruthy()

      const useCardBtn = screen.getByTestId('defensive-card-bouclier')
      fireEvent.click(useCardBtn)
      expect(onResolveInteraction).toHaveBeenCalledWith({ cardId: 'bouclier' })

      rerender(
        <RevealModal
          pendingInteraction={pendingInteraction}
          players={dummyPlayers}
          onResolveInteraction={onResolveInteraction}
        />
      )

      const skipBtn = screen.getByTestId('defensive-skip')
      fireEvent.click(skipBtn)
      expect(onResolveInteraction).toHaveBeenCalledWith({ skip: true })
    })

    it('handles shop interaction with costs, disable states and skip', () => {
      const onResolveInteraction = vi.fn()
      // Player 0 (Alice) has 3500 score: can buy common (1000) and rare (2000), but not legendary (4000)
      const pendingInteraction = {
        type: 'shop',
        tier: 20000,
        playerIndex: 0,
      }

      const { rerender } = render(
        <RevealModal
          pendingInteraction={pendingInteraction}
          players={dummyPlayers}
          onResolveInteraction={onResolveInteraction}
        />
      )

      expect(screen.getByText('🛒 Boutique du palier 20000')).toBeTruthy()
      expect(
        screen.getByText(/🛒 Boutique du palier 20000 pour Alice \(score: 3500\)/)
      ).toBeTruthy()

      const buyCommon = screen.getByTestId('shop-buy-common')
      const buyRare = screen.getByTestId('shop-buy-rare')
      const buyLegendary = screen.getByTestId('shop-buy-legendary')
      const skipBtn = screen.getByTestId('shop-skip')

      expect(buyCommon.disabled).toBe(false)
      expect(buyRare.disabled).toBe(false)
      expect(buyLegendary.disabled).toBe(true)

      fireEvent.click(buyRare)
      expect(onResolveInteraction).toHaveBeenCalledWith({ rarity: 'rare' })

      fireEvent.click(buyCommon)
      expect(onResolveInteraction).toHaveBeenCalledWith({ rarity: 'common' })

      // Player with 5000 score can buy legendary
      rerender(
        <RevealModal
          pendingInteraction={{ type: 'shop', tier: 40000, playerIndex: 0 }}
          players={[{ name: 'RichAlice', score: 5000 }]}
          onResolveInteraction={onResolveInteraction}
        />
      )
      const richBuyLeg = screen.getByTestId('shop-buy-legendary')
      expect(richBuyLeg.disabled).toBe(false)
      fireEvent.click(richBuyLeg)
      expect(onResolveInteraction).toHaveBeenCalledWith({ rarity: 'legendary' })

      fireEvent.click(skipBtn)
      expect(onResolveInteraction).toHaveBeenCalledWith({ skip: true })
    })

    it('returns null for unknown pendingInteraction type', () => {
      const { container } = render(
        <RevealModal pendingInteraction={{ type: 'unknown-type' }} />
      )
      expect(container.firstChild).toBeNull()
    })
  })
})
