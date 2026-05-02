import { useState } from 'react'

const MIN_PLAYERS = 2

export const SetupScreen = ({ onStart }) => {
  const [playerNames, setPlayerNames] = useState(['Joueur 1', 'Joueur 2'])

  const handlePlayerChange = (index, value) => {
    setPlayerNames((previous) => previous.map((name, itemIndex) => (itemIndex === index ? value : name)))
  }

  const handleAddPlayer = () => {
    setPlayerNames((previous) => [...previous, `Joueur ${previous.length + 1}`])
  }

  const handleRemovePlayer = (index) => {
    setPlayerNames((previous) => previous.filter((_, itemIndex) => itemIndex !== index))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const players = playerNames.map((name) => name.trim()).filter(Boolean)
    if (players.length >= MIN_PLAYERS) {
      onStart(players)
    }
  }

  const canStart = playerNames.map((name) => name.trim()).filter(Boolean).length >= MIN_PLAYERS

  return (
    <section>
      <h1>Nouvelle partie</h1>
      <form onSubmit={handleSubmit}>
        {playerNames.map((name, index) => (
          <div key={`player-${index}`}>
            <label htmlFor={`player-input-${index}`}>Joueur {index + 1}</label>
            <input
              id={`player-input-${index}`}
              name={`player-${index}`}
              value={name}
              onChange={(event) => handlePlayerChange(index, event.target.value)}
            />
            {playerNames.length > MIN_PLAYERS ? (
              <button type="button" onClick={() => handleRemovePlayer(index)}>
                Supprimer
              </button>
            ) : null}
          </div>
        ))}
        <button type="button" onClick={handleAddPlayer}>
          + Ajouter un joueur
        </button>
        <button type="submit" disabled={!canStart}>
          Commencer
        </button>
      </form>
    </section>
  )
}
