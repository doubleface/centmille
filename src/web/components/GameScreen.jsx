import { PlayerColumn } from './PlayerColumn.jsx'
import { ScoreInput } from './ScoreInput.jsx'

export const GameScreen = ({ players }) => {
  return (
    <section>
      <h1>Partie en cours</h1>
      <div>
        {players.map((player) => (
          <PlayerColumn key={player} name={player} rows={[]} />
        ))}
      </div>
      <ScoreInput />
    </section>
  )
}
