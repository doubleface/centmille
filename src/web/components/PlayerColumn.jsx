import { ScoreRow } from './ScoreRow.jsx'

export const PlayerColumn = ({ name, rows }) => {
  return (
    <article>
      <h2>{name}</h2>
      <div>
        {rows.length === 0 ? <ScoreRow label="—" /> : null}
        {rows.map((row, index) => (
          <ScoreRow key={`${name}-row-${index}`} label={row.label} variant={row.variant} />
        ))}
      </div>
    </article>
  )
}
