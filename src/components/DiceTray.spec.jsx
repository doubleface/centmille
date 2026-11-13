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
