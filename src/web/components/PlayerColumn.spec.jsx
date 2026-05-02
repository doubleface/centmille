// @vitest-environment jsdom

import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PlayerColumn } from './PlayerColumn.jsx'

describe('PlayerColumn', () => {
  it('renders bust and downgrade rows', () => {
    render(
      <PlayerColumn
        name="Alice"
        rows={[
          { label: '500', variant: 'normal', isDowngraded: true },
          { label: ' ', variant: 'bust', isDowngraded: false },
        ]}
      />
    )

    const scoreRow = screen.getByText('500').closest('.score-row')
    expect(scoreRow?.className).toContain('downgrade')

    const bustRow = document.querySelector('.score-row[data-variant="bust"]')
    expect(bustRow?.className).toContain('bust')
  })
})
