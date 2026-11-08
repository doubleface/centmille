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

    // Submitting form while invalid does not trigger onStart
    fireEvent.submit(submitBtn.closest('form'))
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('selects input text on focus', () => {
    const onStart = vi.fn()
    render(<SetupScreen onStart={onStart} />)

    const input = screen.getByDisplayValue('Joueur 1')
    const selectSpy = vi.spyOn(input, 'select')
    fireEvent.focus(input)
    expect(selectSpy).toHaveBeenCalled()
  })

  it('supports selecting Cent Mille mode, toggling options and submitting', () => {
    const onStart = vi.fn()
    render(<SetupScreen onStart={onStart} />)

    const centMilleBtn = screen.getByTestId('mode-cent-mille')
    fireEvent.click(centMilleBtn)

    const redZoneToggle = screen.getByTestId('toggle-red-zone')
    const shopToggle = screen.getByTestId('toggle-shop')

    expect(redZoneToggle.checked).toBe(true)
    expect(shopToggle.checked).toBe(true)

    fireEvent.click(redZoneToggle)
    fireEvent.click(shopToggle)

    expect(redZoneToggle.checked).toBe(false)
    expect(shopToggle.checked).toBe(false)

    fireEvent.click(screen.getByText('Commencer la partie'))
    expect(onStart).toHaveBeenCalledWith(['Joueur 1', 'Joueur 2'], {
      mode: 'cent-mille',
      redZoneEnabled: false,
      shopEnabled: false,
    })
  })

  it('supports selecting Dix Mille Bonus mode without extra options and submitting', () => {
    const onStart = vi.fn()
    render(<SetupScreen onStart={onStart} />)

    const dixMilleBonusBtn = screen.getByTestId('mode-dix-mille-bonus')
    expect(dixMilleBonusBtn.textContent).toContain('🎁 Dix Mille Bonus (10 000)')
    expect(dixMilleBonusBtn.textContent).toContain('Avant-goût : cartes, nombres magiques et succès')

    fireEvent.click(dixMilleBonusBtn)

    // No extra options should be visible
    expect(screen.queryByTestId('toggle-red-zone')).toBeNull()
    expect(screen.queryByTestId('toggle-shop')).toBeNull()

    fireEvent.click(screen.getByText('Commencer la partie'))
    expect(onStart).toHaveBeenCalledWith(['Joueur 1', 'Joueur 2'], {
      mode: 'dix-mille-bonus',
    })
  })

  it('allows switching from Cent Mille back to quick-10k mode', () => {
    const onStart = vi.fn()
    render(<SetupScreen onStart={onStart} />)

    fireEvent.click(screen.getByTestId('mode-cent-mille'))
    expect(screen.getByTestId('toggle-red-zone')).toBeTruthy()

    fireEvent.click(screen.getByTestId('mode-quick-10k'))
    expect(screen.queryByTestId('toggle-red-zone')).toBeNull()
    expect(screen.queryByTestId('toggle-shop')).toBeNull()

    fireEvent.click(screen.getByText('Commencer la partie'))
    expect(onStart).toHaveBeenCalledWith(['Joueur 1', 'Joueur 2'])
  })

  it('displays offline preload progress and completion status', () => {
    const onStart = vi.fn()
    const { rerender } = render(
      <SetupScreen
        onStart={onStart}
        preloadStatus={{ loaded: 12, processed: 12, total: 37, done: false }}
      />
    )

    expect(screen.getByTestId('offline-preload-status').textContent).toContain(
      '📥 Mise en cache hors-ligne : 12 / 37 cartes…'
    )

    rerender(
      <SetupScreen
        onStart={onStart}
        preloadStatus={{ loaded: 36, processed: 37, total: 37, done: true }}
      />
    )

    expect(screen.getByTestId('offline-preload-status').textContent).toContain(
      '✅ Prêt hors-ligne (36 / 37 illustrations en cache)'
    )
  })
})
