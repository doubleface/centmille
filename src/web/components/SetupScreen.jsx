import { useState } from 'react'

const parsePlayers = (value) =>
  value
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)

export const SetupScreen = ({ onStart }) => {
  const [rawPlayers, setRawPlayers] = useState('Alice, Bob')

  const handleSubmit = (event) => {
    event.preventDefault()
    const players = parsePlayers(rawPlayers)
    if (players.length >= 2) {
      onStart(players)
    }
  }

  return (
    <section>
      <h1>Nouvelle partie</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="players-input">Joueurs (séparés par des virgules)</label>
        <input
          id="players-input"
          name="players"
          value={rawPlayers}
          onChange={(event) => setRawPlayers(event.target.value)}
        />
        <button type="submit">Commencer</button>
      </form>
    </section>
  )
}
