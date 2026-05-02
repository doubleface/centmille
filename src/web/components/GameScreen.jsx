import { CornerMenu } from './CornerMenu.jsx'
import { PlayerColumn } from './PlayerColumn.jsx'
import { ScoreInput } from './ScoreInput.jsx'

export const GameScreen = ({
  players,
  rowsByPlayer = {},
  currentPlayer,
  onRecordTurn,
  onRecordBust,
  onUndo,
  onResetGame,
  errorMessage,
}) => {
  return (
    <section className="sheet-screen">
      <h1 className="sheet-screen__title">Partie en cours</h1>

      <div className="scoreboard">
        {players.map((player) => (
          <PlayerColumn
            key={player}
            name={player}
            rows={rowsByPlayer[player] ?? []}
            isCurrentPlayer={currentPlayer?.name === player}
          />
        ))}
      </div>

      <ScoreInput
        currentPlayer={currentPlayer}
        onValidate={onRecordTurn}
        onBust={onRecordBust}
        errorMessage={errorMessage}
      />

      <CornerMenu onUndo={onUndo} onResetGame={onResetGame} />
    </section>
  )
}
