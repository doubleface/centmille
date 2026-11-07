// @vitest-environment jsdom

import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CornerMenu } from './CornerMenu.jsx'

afterEach(() => {
  cleanup()
})

describe('CornerMenu', () => {
  it('opens menu, triggers undo and closes', () => {
    const onUndo = vi.fn()
    const onResetGame = vi.fn()

    render(<CornerMenu onUndo={onUndo} onResetGame={onResetGame} />)

    fireEvent.click(screen.getByLabelText('Menu de la partie'))
    fireEvent.click(screen.getByText('Annuler le dernier tour'))

    expect(onUndo).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Recommencer la partie')).toBeNull()
  })

  it('shows reset confirmation then confirms reset', () => {
    const onUndo = vi.fn()
    const onResetGame = vi.fn()

    render(<CornerMenu onUndo={onUndo} onResetGame={onResetGame} />)

    fireEvent.click(screen.getByLabelText('Menu de la partie'))
    fireEvent.click(screen.getByText('Recommencer la partie'))
    fireEvent.click(screen.getByText('Confirmer'))

    expect(onResetGame).toHaveBeenCalledTimes(1)
  })
})
