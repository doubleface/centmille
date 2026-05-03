import React, { useEffect, useRef } from 'react'
import { ScoreRow } from './ScoreRow.jsx'

export const PlayerColumn = ({
  name,
  rows,
  isCurrentPlayer = false,
  isCollisionTarget = false,
  shouldAutoScroll = false,
}) => {
  const className = `player-column ${isCurrentPlayer ? 'player-column--current' : ''} ${isCollisionTarget ? 'player-column--collision-target' : ''}`.trim()
  const articleRef = useRef(null)

  useEffect(() => {
    if (!shouldAutoScroll || !articleRef.current) return
    const column = articleRef.current
    const scroller = column.parentElement
    if (!scroller || typeof scroller.scrollTo !== 'function') return
    const target = column.offsetLeft - (scroller.clientWidth - column.offsetWidth) / 2
    scroller.scrollTo({ left: target, behavior: 'smooth' })
  }, [shouldAutoScroll])

  return (
    <article ref={articleRef} className={className}>
      <div className="player-column__rows">
        {rows.length === 0 ? <ScoreRow label="—" /> : null}
        {rows.map((row, index) => (
          <ScoreRow
            key={`${name}-row-${index}`}
            label={row.label}
            variant={row.variant}
            isDowngraded={row.isDowngraded}
            bustCount={row.bustCount}
          />
        ))}
      </div>
      <h2 className="player-column__header">{name}</h2>
    </article>
  )
}
