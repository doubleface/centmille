import React from 'react'
import { ScoreRow } from './ScoreRow.jsx'

export const PlayerColumn = ({ name, rows }) => {
  return (
    <article className="player-column">
      <h2 className="player-column__header">{name}</h2>
      <div className="player-column__rows">
        {rows.length === 0 ? <ScoreRow label="—" /> : null}
        {rows.map((row, index) => (
          <ScoreRow
            key={`${name}-row-${index}`}
            label={row.label}
            variant={row.variant}
            isDowngraded={row.isDowngraded}
          />
        ))}
      </div>
    </article>
  )
}
