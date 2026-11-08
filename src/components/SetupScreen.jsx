import React, { useState } from 'react'

const MIN_PLAYERS = 2

export const SetupScreen = ({ onStart }) => {
  const [playerNames, setPlayerNames] = useState(['Joueur 1', 'Joueur 2'])
  const [mode, setMode] = useState('quick-10k')
  const [redZoneEnabled, setRedZoneEnabled] = useState(true)
  const [shopEnabled, setShopEnabled] = useState(true)

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
      if (mode === 'cent-mille') {
        onStart(players, { mode: 'cent-mille', redZoneEnabled, shopEnabled })
      } else {
        onStart(players)
      }
    }
  }

  const canStart = playerNames.map((name) => name.trim()).filter(Boolean).length >= MIN_PLAYERS

  return (
    <section className="sheet-screen">
      <h1 className="sheet-screen__title">Nouvelle partie</h1>
      <form onSubmit={handleSubmit}>
        <div className="mode-selector">
          <button
            type="button"
            data-testid="mode-quick-10k"
            className={`mode-card ${mode === 'quick-10k' ? 'mode-card--active' : ''}`}
            onClick={() => setMode('quick-10k')}
          >
            <span className="mode-card__title">⚡ Partie rapide (10 000)</span>
            <span className="mode-card__desc">Règles classiques, sans bonus</span>
          </button>
          <button
            type="button"
            data-testid="mode-cent-mille"
            className={`mode-card ${mode === 'cent-mille' ? 'mode-card--active' : ''}`}
            onClick={() => setMode('cent-mille')}
          >
            <span className="mode-card__title">👑 Cent Mille (100 000)</span>
            <span className="mode-card__desc">
              Soirée complète, cartes jokers, événements & surprises
            </span>
          </button>
        </div>

        {mode === 'cent-mille' && (
          <div className="mode-options">
            <label className="mode-option">
              <input
                type="checkbox"
                data-testid="toggle-red-zone"
                checked={redZoneEnabled}
                onChange={(event) => setRedZoneEnabled(event.target.checked)}
              />
              <span>🚨 Zone rouge (à partir de 90 000 pts)</span>
            </label>
            <label className="mode-option">
              <input
                type="checkbox"
                data-testid="toggle-shop"
                checked={shopEnabled}
                onChange={(event) => setShopEnabled(event.target.checked)}
              />
              <span>🛒 Boutique aux paliers (20k, 40k, 60k, 80k)</span>
            </label>
          </div>
        )}

        {playerNames.map((name, index) => (
          <div key={`player-${index}`} className="field">
            <label className="field__label" htmlFor={`player-input-${index}`}>
              Joueur {index + 1}
            </label>
            <input
              className="field__input"
              id={`player-input-${index}`}
              name={`player-${index}`}
              value={name}
              onFocus={(event) => event.target.select()}
              onChange={(event) => handlePlayerChange(index, event.target.value)}
            />
            {playerNames.length > MIN_PLAYERS ? (
              <button
                type="button"
                className="field__remove"
                aria-label={`Supprimer joueur ${index + 1}`}
                onClick={() => handleRemovePlayer(index)}
              >
                ✗
              </button>
            ) : null}
          </div>
        ))}
        <div className="btn-row">
          <button type="button" className="btn btn--ghost" onClick={handleAddPlayer}>
            + Ajouter un joueur
          </button>
          <button type="submit" className="btn btn--primary" disabled={!canStart}>
            Commencer la partie
          </button>
        </div>
      </form>
    </section>
  )
}
