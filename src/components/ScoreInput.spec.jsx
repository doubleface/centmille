// @vitest-environment jsdom

import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ScoreInput } from './ScoreInput.jsx'

afterEach(() => {
  cleanup()
})

describe('ScoreInput', () => {
  it('validates a multiple of 100 on click or Enter key and clears input', () => {
    const onValidate = vi.fn()
    const onBust = vi.fn()

    render(
      <ScoreInput
        currentPlayer={{ name: 'Alice', hasOpened: true }}
        onValidate={onValidate}
        onBust={onBust}
      />
    )

    const input = screen.getByLabelText('Score du tour')
    fireEvent.change(input, { target: { value: '400' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onValidate).toHaveBeenCalledWith(400)
    expect(input.value).toBe('')

    // Next score via button click
    fireEvent.change(input, { target: { value: '600' } })
    fireEvent.click(screen.getByText('Valider'))
    expect(onValidate).toHaveBeenCalledWith(600)
  })

  it('prevents validating below 500 when opening is needed', () => {
    const onValidate = vi.fn()

    render(
      <ScoreInput
        currentPlayer={{ name: 'Bob', hasOpened: false }}
        onValidate={onValidate}
        onBust={vi.fn()}
      />
    )

    expect(screen.getByText('ouverture 500')).toBeTruthy()

    const input = screen.getByLabelText('Score du tour')
    fireEvent.change(input, { target: { value: '300' } })
    expect(screen.getByText('Valider').disabled).toBe(true)

    fireEvent.change(input, { target: { value: '500' } })
    expect(screen.getByText('Valider').disabled).toBe(false)
  })

  it('allows multiples of 50 only when allowNonMultipleOf100 is true', () => {
    const onValidate = vi.fn()

    const { rerender } = render(
      <ScoreInput
        currentPlayer={{ name: 'Alice', hasOpened: true }}
        onValidate={onValidate}
        onBust={vi.fn()}
        allowNonMultipleOf100={false}
      />
    )

    const input = screen.getByLabelText('Score du tour')
    fireEvent.change(input, { target: { value: '350' } })
    expect(screen.getByText('Valider').disabled).toBe(true)

    rerender(
      <ScoreInput
        currentPlayer={{ name: 'Alice', hasOpened: true }}
        onValidate={onValidate}
        onBust={vi.fn()}
        allowNonMultipleOf100={true}
      />
    )
    expect(screen.getByText('Valider').disabled).toBe(false)
  })

  it('calls onBust with accumulatedPoints when assuranceActive is true and score is valid', () => {
    const onBust = vi.fn()

    render(
      <ScoreInput
        currentPlayer={{ name: 'Alice', hasOpened: true }}
        onValidate={vi.fn()}
        onBust={onBust}
        assuranceActive={true}
      />
    )

    const input = screen.getByLabelText('Score du tour')
    fireEvent.change(input, { target: { value: '750' } })
    fireEvent.click(screen.getByText('Échec'))

    expect(onBust).toHaveBeenCalledWith({ accumulatedPoints: 750 })
    expect(input.value).toBe('')
  })

  it('calls onBust with no arguments when assuranceActive is false', () => {
    const onBust = vi.fn()

    render(
      <ScoreInput
        currentPlayer={{ name: 'Alice', hasOpened: true }}
        onValidate={vi.fn()}
        onBust={onBust}
        assuranceActive={false}
      />
    )

    const input = screen.getByLabelText('Score du tour')
    fireEvent.change(input, { target: { value: '750' } })
    fireEvent.click(screen.getByText('Échec'))

    expect(onBust).toHaveBeenCalledWith()
  })

  it('renders bomb target selector when bombHolder and score >= 1000', () => {
    const onValidate = vi.fn()
    const players = [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charly' }]

    render(
      <ScoreInput
        currentPlayer={{ name: 'Alice', hasOpened: true }}
        onValidate={onValidate}
        onBust={vi.fn()}
        bombHolder={true}
        players={players}
        currentPlayerIndex={0}
      />
    )

    const input = screen.getByLabelText('Score du tour')
    fireEvent.change(input, { target: { value: '900' } })
    expect(screen.queryByTestId('bomb-target-select')).toBeNull()

    fireEvent.change(input, { target: { value: '1200' } })
    const select = screen.getByTestId('bomb-target-select')
    expect(select).toBeTruthy()

    // Default target is Bob (index 1). Change to Charly (index 2).
    fireEvent.change(select, { target: { value: '2' } })
    fireEvent.click(screen.getByText('Valider'))

    expect(onValidate).toHaveBeenCalledWith(1200, { bombTargetIndex: 2 })
  })

  it('respects isLocked and displays lockMessage and errorMessage', () => {
    render(
      <ScoreInput
        currentPlayer={{ name: 'Alice', hasOpened: true }}
        onValidate={vi.fn()}
        onBust={vi.fn()}
        isLocked={true}
        lockMessage="Verrouillé pour revue"
        errorMessage="Erreur test"
      />
    )

    expect(screen.getByText('Verrouillé pour revue')).toBeTruthy()
    expect(screen.getByText('Erreur test')).toBeTruthy()
    expect(screen.getByText('Valider').disabled).toBe(true)
    expect(screen.getByText('Échec').disabled).toBe(true)
    expect(screen.getByLabelText('Score du tour').disabled).toBe(true)
  })
})
