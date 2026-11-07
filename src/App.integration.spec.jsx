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

const gameSnapshot = {
  players: [
    { name: 'Alice', hasOpened: true },
    { name: 'Bob', hasOpened: true },
    { name: 'Charly', hasOpened: true },
  ],
  currentPlayerIndex: 0,
  winnerIndex: null,
  events: [],
}

vi.mock('./hooks/useGame.js', () => ({
  useGame: () => ({
    snapshot: gameSnapshot,
    startGame: mockStartGame,
    recordTurn: mockRecordTurn,
    recordBust: mockRecordBust,
    undoLastEvent: mockUndoLastEvent,
    resetGame: mockResetGame,
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
})
