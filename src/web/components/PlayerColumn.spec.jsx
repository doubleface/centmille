// @vitest-environment jsdom

import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PlayerColumn } from './PlayerColumn.jsx'

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
    const { container } = render(<PlayerColumn name="Alice" rows={[{ label: '500' }]} isCollisionTarget />)

    expect(container.querySelector('.player-column')?.className).toContain(
      'player-column--collision-target'
    )
  })
})
