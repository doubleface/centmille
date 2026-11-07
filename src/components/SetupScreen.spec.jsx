// @vitest-environment jsdom

import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SetupScreen } from './SetupScreen.jsx'

afterEach(() => {
  cleanup()
})

describe('SetupScreen', () => {
  it('renders default two players and submits', () => {
    const onStart = vi.fn()
    render(<SetupScreen onStart={onStart} />)

    expect(screen.getByDisplayValue('Joueur 1')).toBeTruthy()
    expect(screen.getByDisplayValue('Joueur 2')).toBeTruthy()

    fireEvent.click(screen.getByText('Commencer la partie'))
    expect(onStart).toHaveBeenCalledWith(['Joueur 1', 'Joueur 2'])
  })

  it('allows adding and removing players', () => {
    const onStart = vi.fn()
    render(<SetupScreen onStart={onStart} />)

    fireEvent.click(screen.getByText('+ Ajouter un joueur'))
    expect(screen.getByDisplayValue('Joueur 3')).toBeTruthy()

    const removeBtn = screen.getByLabelText('Supprimer joueur 3')
    fireEvent.click(removeBtn)
    expect(screen.queryByDisplayValue('Joueur 3')).toBeNull()
  })

  it('allows changing player names and handles blank names', () => {
    const onStart = vi.fn()
    render(<SetupScreen onStart={onStart} />)

    const input1 = screen.getByDisplayValue('Joueur 1')
    fireEvent.change(input1, { target: { value: 'Alice' } })

    const input2 = screen.getByDisplayValue('Joueur 2')
    fireEvent.change(input2, { target: { value: 'Bob' } })

    fireEvent.click(screen.getByText('Commencer la partie'))
    expect(onStart).toHaveBeenCalledWith(['Alice', 'Bob'])

    // When blank, cannot start
    fireEvent.change(input1, { target: { value: '   ' } })
    const submitBtn = screen.getByText('Commencer la partie')
    expect(submitBtn.disabled).toBe(true)
  })
})
