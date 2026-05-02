import { useState } from 'react'
import { GameScreen } from './components/GameScreen.jsx'
import { SetupScreen } from './components/SetupScreen.jsx'
import { WinnerBanner } from './components/WinnerBanner.jsx'

export const App = () => {
  const [players, setPlayers] = useState([])

  const handleStart = (playerNames) => {
    setPlayers(playerNames)
  }

  const hasGame = players.length >= 2

  return (
    <main>
      {!hasGame ? <SetupScreen onStart={handleStart} /> : <GameScreen players={players} />}
      <WinnerBanner winner={null} />
    </main>
  )
}
