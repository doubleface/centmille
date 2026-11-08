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
    expect(screen.queryByText('Recommencer la partie ?')).toBeNull()
  })

  it('cancels reset confirmation when clicking Annuler', () => {
    const onUndo = vi.fn()
    const onResetGame = vi.fn()

    render(<CornerMenu onUndo={onUndo} onResetGame={onResetGame} />)

    fireEvent.click(screen.getByLabelText('Menu de la partie'))
    fireEvent.click(screen.getByText('Recommencer la partie'))
    expect(screen.getByText('Recommencer la partie ?')).toBeTruthy()

    fireEvent.click(screen.getByText('Annuler'))
    expect(screen.queryByText('Recommencer la partie ?')).toBeNull()
    expect(screen.getByText('Recommencer la partie')).toBeTruthy()
  })

  it('renders Grimoire option when hasGrimoire is true and opens it', () => {
    const onOpenGrimoire = vi.fn()

    render(
      <CornerMenu
        onUndo={vi.fn()}
        onResetGame={vi.fn()}
        hasGrimoire={true}
        onOpenGrimoire={onOpenGrimoire}
      />
    )

    fireEvent.click(screen.getByLabelText('Menu de la partie'))
    const grimoireBtn = screen.getByTestId('menu-open-grimoire')
    expect(grimoireBtn).toBeTruthy()
    expect(grimoireBtn.textContent).toContain('Grimoire')

    fireEvent.click(grimoireBtn)
    expect(onOpenGrimoire).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('menu-open-grimoire')).toBeNull()
  })

  it('maintains backwards compatibility for isCentMille prop', () => {
    const onOpenGrimoire = vi.fn()

    render(
      <CornerMenu
        onUndo={vi.fn()}
        onResetGame={vi.fn()}
        isCentMille={true}
        onOpenGrimoire={onOpenGrimoire}
      />
    )

    fireEvent.click(screen.getByLabelText('Menu de la partie'))
    expect(screen.getByTestId('menu-open-grimoire')).toBeTruthy()
  })

  it('renders sound mute toggle option and calls onToggleMute', () => {
    const onToggleMute = vi.fn()

    const { rerender } = render(
      <CornerMenu
        onUndo={vi.fn()}
        onResetGame={vi.fn()}
        isMuted={false}
        onToggleMute={onToggleMute}
      />
    )

    fireEvent.click(screen.getByLabelText('Menu de la partie'))
    const muteBtn = screen.getByTestId('menu-toggle-mute')
    expect(muteBtn.textContent).toContain('Couper le son')
    expect(muteBtn.textContent).toContain('🔊')

    fireEvent.click(muteBtn)
    expect(onToggleMute).toHaveBeenCalledTimes(1)

    rerender(
      <CornerMenu
        onUndo={vi.fn()}
        onResetGame={vi.fn()}
        isMuted={true}
        onToggleMute={onToggleMute}
      />
    )
    expect(screen.getByTestId('menu-toggle-mute').textContent).toContain('Activer le son')
    expect(screen.getByTestId('menu-toggle-mute').textContent).toContain('🔇')
  })

  it('closes menu when clicking outside', () => {
    render(
      <div>
        <div data-testid="outside">Dehors</div>
        <CornerMenu onUndo={vi.fn()} onResetGame={vi.fn()} />
      </div>
    )

    fireEvent.click(screen.getByLabelText('Menu de la partie'))
    expect(screen.getByText('Annuler le dernier tour')).toBeTruthy()

    fireEvent.mouseDown(screen.getByTestId('outside'))
    expect(screen.queryByText('Annuler le dernier tour')).toBeNull()
  })

  it('closes menu when pressing Escape key', () => {
    render(<CornerMenu onUndo={vi.fn()} onResetGame={vi.fn()} />)

    fireEvent.click(screen.getByLabelText('Menu de la partie'))
    expect(screen.getByText('Annuler le dernier tour')).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByText('Annuler le dernier tour')).toBeNull()
  })
})
