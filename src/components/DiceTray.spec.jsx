// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { newDiceTurn, rollDiceTurn } from '../game/DiceTurn.js'
import { DiceTray } from './DiceTray.jsx'

afterEach(cleanup)

function mount(turn, isLocked = false) {
  render(<DiceTray turn={turn} player={{ name: 'Alice', score: 0, hasOpened: false }}
    openingScore={500} targetScore={10000} isLocked={isLocked} />)
}

function positions(face) {
  return [...face.querySelectorAll('circle')].map(pip => [
    Number(pip.getAttribute('cx')), Number(pip.getAttribute('cy')),
  ])
}

describe('faces du plateau réellement rendues, sans mock', () => {
  it.each([
    [1, [[20, 20]]],
    [2, [[10, 10], [30, 30]]],
    [3, [[10, 10], [20, 20], [30, 30]]],
    [4, [[10, 10], [30, 10], [10, 30], [30, 30]]],
    [5, [[10, 10], [30, 10], [20, 20], [10, 30], [30, 30]]],
    [6, [[10, 10], [30, 10], [10, 20], [30, 20], [10, 30], [30, 30]]],
  ])('dessine la face %i avec sa disposition classique et son état réservé', (value, expected) => {
    const turn = rollDiceTurn(newDiceTurn(), Array(5).fill(value))
    mount(turn)
    const faces = screen.getAllByRole('img', { name: new RegExp(`: ${value}, gardé, bloqué jusqu’à main pleine$`) })
    expect(faces).toHaveLength(5)
    for (const face of faces) {
      expect(positions(face)).toEqual(expected)
      expect(face.querySelector('text')).toBeNull()
      expect(face.closest('li').classList.contains('dice-tray__die--kept')).toBe(true)
    }
    expect(screen.getAllByText('Gardé')).toHaveLength(5)
    expect(screen.queryAllByRole('button', { name: /Dé \d/ })).toHaveLength(0)
  })

  it('distingue les dés non lancés des dés libres et conserve les faces gardées entre lancers', () => {
    mount(newDiceTurn())
    const empty = screen.getAllByRole('img', { name: /non lancé, libre$/ })
    expect(empty).toHaveLength(5)
    for (const face of empty) {
      expect(positions(face)).toEqual([])
      expect(face.textContent).toBe('—')
    }
    cleanup()
    const first = rollDiceTurn(newDiceTurn(), [1, 5, 2, 3, 6])
    mount(first)
    expect(screen.getAllByRole('img', { name: /gardé, bloqué/ })).toHaveLength(2)
    for (const [index, value] of [[3, 2], [4, 3], [5, 6]]) {
      const face = screen.getByRole('img', { name: `Dé ${index} : ${value}, libre` })
      expect(positions(face)).toHaveLength(value)
      expect(face.closest('li').classList.contains('dice-tray__die--kept')).toBe(false)
    }
    cleanup()
    mount(rollDiceTurn(first, [2, 4, 6]))
    expect(screen.getByRole('img', { name: 'Dé 1 : 1, gardé, bloqué jusqu’à main pleine' })).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Dé 2 : 5, gardé, bloqué jusqu’à main pleine' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Confirmer la broucouille' })).toBeTruthy()
  })

  it('affiche le brut et le score après cartes, puis bloque le dépassement effectif', () => {
    const turn = rollDiceTurn(newDiceTurn(), [1, 1, 5, 2, 3])
    const props = { turn, player: { name: 'Alice', score: 0, hasOpened: false },
      openingScore: 500, targetScore: 10000, activeTurnModifiers: { arrondi: true, doubleur: true } }
    const view = render(<DiceTray {...props} />)
    expect(screen.getByText(/Cumul du tour/).textContent).toBe('Cumul du tour 250')
    expect(screen.getByText(/Score après cartes/).textContent).toBe('Score après cartes : 600 pts')
    expect(screen.getByRole('button', { name: 'Arrêter et marquer' }).disabled).toBe(false)
    expect(screen.queryByText(/encore/)).toBeNull()
    view.rerender(<DiceTray {...props} player={{ name: 'Alice', score: 9500, hasOpened: true }} />)
    expect(screen.queryByRole('button', { name: /Continuer/ })).toBeNull()
    expect(screen.getByRole('button', { name: 'Confirmer l’échec (dépassement)' })).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Confirmer l’échec (dépassement)' }))
    expect(turn.total).toBe(250)
  })

  it.each([
    [[5, 5, 5, 2, 3], { contratTarget: 500 }, 1000],
    [[1, 1, 1, 2, 3], { toutOuRien: true }, 3000],
  ])('annonce le gain %i uniquement quand la condition de carte est réellement satisfaite', (faces, activeTurnModifiers, expected) => {
    render(<DiceTray turn={rollDiceTurn(newDiceTurn(), faces)} player={{ name: 'Alice', score: 0, hasOpened: false }}
      openingScore={500} targetScore={10000} activeTurnModifiers={activeTurnModifiers} />)
    expect(screen.queryByText(/Arrêter maintenant entraîne/)).toBeNull()
    expect(screen.getByText(/Score après cartes/).textContent).toBe(`Score après cartes : ${expected} pts`)
    expect(screen.getByRole('button', { name: 'Arrêter et marquer' }).disabled).toBe(false)
  })

  it('rend six dés réels et les libellés de main pleine6, sans sélection', () => {
    const view = render(<DiceTray turn={newDiceTurn([], 6)} player={{ name: 'Alice', score: 0 }} openingScore={500} targetScore={10000} />)
    expect(screen.getAllByRole('img')).toHaveLength(6)
    expect(screen.getByRole('button', { name: 'Lancer les 6 dés' })).toBeTruthy()
    view.rerender(<DiceTray turn={rollDiceTurn(newDiceTurn([], 6), [1, 2, 3, 4, 5, 6])}
      player={{ name: 'Alice', score: 0, hasOpened: true }} openingScore={500} targetScore={10000} />)
    expect(screen.getAllByRole('img', { name: /gardé, bloqué/ })).toHaveLength(6)
    expect(screen.getByText('Main pleine : relancez les 6 dés, cumul conservé.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Continuer · 6 dés' })).toBeTruthy()
    expect(screen.getByText(/Cumul du tour/).textContent).toBe('Cumul du tour 1600')
  })

  it('affiche le montant effectif repris puis sa projection après le nouveau Doubleur', () => {
    const carry = { rolls: [[5, 5, 5, 2, 3]], total: 1000, diceCount: 5 }
    const inherited = newDiceTurn(carry)
    const props = { player: { name: 'Bob', score: 0, hasOpened: false }, openingScore: 500, targetScore: 10000, activeTurnModifiers: { doubleur: true } }
    const view = render(<DiceTray {...props} turn={newDiceTurn()} carry={carry} />)
    expect(screen.getByRole('button', { name: 'Reprendre 1000 pts · lancer 2 dés' })).toBeTruthy()
    view.rerender(<DiceTray {...props} turn={inherited} />)
    expect(screen.getByRole('button', { name: 'Arrêter et marquer' }).disabled).toBe(true)
    view.rerender(<DiceTray {...props} turn={rollDiceTurn(inherited, [1, 2])} />)
    expect(screen.getByText('dont 1000 repris')).toBeTruthy()
    expect(screen.getByText(/Cumul du tour/).textContent).toBe('Cumul du tour 1100dont 1000 repris')
    expect(screen.getByText(/Score après cartes/).textContent).toBe('Score après cartes : 2200 pts')
    expect(screen.getByRole('button', { name: 'Arrêter et marquer' }).disabled).toBe(false)
  })

  it('affiche une reprise6 adaptée à cinq dés, cumul conservé', () => {
    render(<DiceTray turn={newDiceTurn()} carry={{ rolls: [[1, 2, 3, 4, 5, 6]], total: 1600, diceCount: 6 }}
      player={{ name: 'Bob', score: 0 }} openingScore={500} targetScore={10000} />)
    expect(screen.queryByText(/règle à préciser/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Reprendre 1600 pts · lancer 5 dés' }).disabled).toBe(false)
    expect(screen.getByRole('button', { name: 'Lancer les 5 dés' }).disabled).toBe(false)
  })

  it('conserve les valeurs et les états lisibles pendant le verrouillage des commandes', () => {
    mount(rollDiceTurn(newDiceTurn(), [1, 5, 2, 3, 6]), true)
    const tray = screen.getByRole('region', { name: 'Plateau de dés virtuels' })
    expect(within(tray).getAllByRole('img')).toHaveLength(5)
    expect(within(tray).getAllByText('Gardé')).toHaveLength(2)
    expect(within(tray).getAllByText('Libre')).toHaveLength(3)
    expect(screen.getByText('Terminez les confirmations avant de continuer.')).toBeTruthy()
    for (const button of within(tray).getAllByRole('button')) expect(button.disabled).toBe(true)
  })
})
