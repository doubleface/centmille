export const WinnerBanner = ({ winner }) => {
  if (!winner) return null

  return (
    <aside>
      <strong>{winner}</strong> a gagné la partie.
    </aside>
  )
}
