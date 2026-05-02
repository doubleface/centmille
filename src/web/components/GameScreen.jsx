import { PlayerColumn } from './PlayerColumn.jsx'
import { ScoreInput } from './ScoreInput.jsx'

export const GameScreen = ({
  players,
  rowsByPlayer = {},
  currentPlayer,
  onRecordTurn,
  onRecordBust,
  onUndo,
  errorMessage,
}) => {
  return (
    <section className="sheet-screen">
      <h1 className="sheet-screen__title">Partie en cours</h1>
      <div className="sheet-grid">
        {players.map((player) => (
          <PlayerColumn key={player} name={player} rows={rowsByPlayer[player] ?? []} />
        ))}
      </div>
      <ScoreInput
        currentPlayer={currentPlayer}
        onValidate={onRecordTurn}
        onBust={onRecordBust}
        onUndo={onUndo}
        errorMessage={errorMessage}
      />
    </section>
  )
}
