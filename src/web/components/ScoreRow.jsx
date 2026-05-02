export const ScoreRow = ({ label, variant }) => {
  return (
    <div data-variant={variant ?? 'normal'}>
      <span>{label}</span>
    </div>
  )
}
