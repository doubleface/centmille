import React from 'react'

export const WinnerBanner = ({ winner }) => {
  if (!winner) return null

  return (
    <aside className="winner-banner">
      <strong>{winner}</strong> a gagné la partie.
    </aside>
  )
}
