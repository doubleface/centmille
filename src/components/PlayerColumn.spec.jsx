// @vitest-environment jsdom

import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PlayerColumn } from './PlayerColumn.jsx'

afterEach(() => {
  cleanup()
})

describe('PlayerColumn', () => {
  it('renders bust marks and downgrade style on the latest score row', () => {
    render(
      <PlayerColumn
        name="Alice"
        rows={[{ label: '500', variant: 'normal', isDowngraded: true, bustCount: 2 }]}
      />
    )

    const scoreRow = screen.getByText('500').closest('.score-row')
    expect(scoreRow?.className).toContain('downgrade')
    expect(screen.getByText('✗✗')).toBeTruthy()
  })

  it('highlights the column when player is current collision target', () => {
    const { container } = render(
      <PlayerColumn name="Alice" rows={[{ label: '500' }]} isCollisionTarget />
    )

    expect(container.querySelector('.player-column')?.className).toContain(
      'player-column--collision-target'
    )
  })

  it('renders badges when provided', () => {
    const badges = [
      { id: 'crown', icon: '👑', title: 'Porteur de la Couronne' },
      { id: 'frozen', icon: '🧊', title: 'Gelé' },
    ]

    render(<PlayerColumn name="Alice" rows={[{ label: '1000' }]} badges={badges} />)

    const badgesContainer = screen.getByTestId('badges-Alice')
    expect(badgesContainer).toBeTruthy()
    expect(badgesContainer.children).toHaveLength(2)

    const crownBadge = screen.getByTitle('Porteur de la Couronne')
    expect(crownBadge.textContent).toBe('👑')
  })

  it('auto-scrolls when shouldAutoScroll is true and parent scroller is present', () => {
    const scrollToMock = vi.fn()
    const parent = document.createElement('div')
    parent.scrollTo = scrollToMock
    document.body.appendChild(parent)

    render(
      <PlayerColumn name="Bob" rows={[{ label: '—' }]} shouldAutoScroll={true} />,
      { container: parent }
    )

    expect(scrollToMock).toHaveBeenCalled()
    document.body.removeChild(parent)
  })
})
