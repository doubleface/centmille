import { Box, render, Text, useApp, useInput } from 'ink'
import React, { useMemo, useState } from 'react'
import { CliSession } from '../cli/CliSession.js'

const parseDiceArg = (rawDice) => {
  if (typeof rawDice !== 'string' || rawDice.trim().length === 0) return null

  const dice = rawDice
    .split(',')
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isInteger(value))

  return dice.length > 0 ? dice : null
}

const parsePlayersArg = (rawPlayers) => {
  if (typeof rawPlayers !== 'string' || rawPlayers.trim().length === 0) return null

  const players = rawPlayers
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)

  return players.length >= 2 ? players : null
}

const formatStatus = (session) => {
  if (!session.hasActiveGame()) {
    return {
      currentPlayer: 'aucun',
      winner: 'aucun',
      activeTurn: 'aucun',
      stagedRoll: session.pendingRollDice ? session.pendingRollDice.join(',') : 'aucun',
      scores: ['Aucune partie active. Appuyez sur n pour commencer.'],
    }
  }

  const snapshot = session.getSnapshot()
  const currentPlayer = snapshot.players[snapshot.currentPlayerIndex]
  const activeTurn = snapshot.activeTurn

  return {
    currentPlayer: currentPlayer.name,
    winner: snapshot.winnerIndex === null ? 'aucun' : snapshot.players[snapshot.winnerIndex].name,
    activeTurn: activeTurn
      ? `turnScore=${activeTurn.turnScore}, diceToRoll=${activeTurn.diceToRoll}, canSteal=${activeTurn.canSteal}`
      : 'aucun',
    stagedRoll: session.pendingRollDice ? session.pendingRollDice.join(',') : 'aucun',
    scores: snapshot.players.map((player, index) => {
      const marker = index === snapshot.currentPlayerIndex ? '>' : ' '
      return `${marker} ${player.name}: ${player.score} pts (fails: ${player.failedTurnsInRow})`
    }),
  }
}

const App = () => {
  const { exit } = useApp()
  const [session] = useState(() => new CliSession())
  const [message, setMessage] = useState({ type: 'info', text: 'Prêt' })
  const [promptMode, setPromptMode] = useState(null)
  const [promptValue, setPromptValue] = useState('')
  const [version, setVersion] = useState(0)

  const refresh = () => setVersion((value) => value + 1)

  const addHistory = (command, args, error = null) => {
    session.addHistory({ at: new Date().toISOString(), command, args, ok: error === null, error })
  }

  const execute = async (command, run, args = []) => {
    try {
      await run()
      addHistory(command, args)
      refresh()
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error)
      setMessage({ type: 'error', text: `Erreur: ${messageText}` })
      addHistory(command, args, messageText)
      refresh()
    }
  }

  const status = useMemo(() => formatStatus(session), [session, version])

  useInput((input, key) => {
    if (promptMode) {
      if (key.return) {
        const value = promptValue
        setPromptMode(null)
        setPromptValue('')

        if (promptMode === 'new') {
          const players = parsePlayersArg(value)
          if (!players) {
            setMessage({ type: 'error', text: 'Erreur: Joueurs invalides. Utilisez Alice,Bob' })
            return
          }
          execute('new', () => {
            session.newGame(players)
            setMessage({ type: 'success', text: `Nouvelle partie: ${players.join(', ')}` })
          }, [`--players=${value}`])
          return
        }

        if (promptMode === 'load') {
          execute('load', async () => {
            await session.load(value)
            setMessage({ type: 'success', text: `Chargé: ${value}` })
          }, [`--file=${value}`])
          return
        }

        if (promptMode === 'roll') {
          const dice = parseDiceArg(value)
          if (!dice) {
            setMessage({ type: 'error', text: 'Erreur: Dés invalides. Utilisez 1,2,3,4,5' })
            return
          }
          execute('roll', () => {
            if (!session.hasActiveGame()) throw new Error('Aucune partie active.')
            session.stageRoll(dice)
            setMessage({ type: 'success', text: `Lancer saisi: ${dice.join(',')}` })
          }, [`--dice=${value}`])
          return
        }

        if (promptMode === 'keep') {
          const keptDice = parseDiceArg(value)
          if (!keptDice) {
            setMessage({ type: 'error', text: 'Erreur: Dés gardés invalides. Utilisez 1,5' })
            return
          }
          execute('keep', () => {
            if (!session.hasActiveGame()) throw new Error('Aucune partie active.')
            if (!session.pendingRollDice) throw new Error('Aucun lancer saisi.')
            session.keep(keptDice)
            setMessage({ type: 'success', text: `Dés gardés: ${keptDice.join(',')}` })
          }, [`--dice=${value}`])
          return
        }

        if (promptMode === 'save') {
          execute('save', async () => {
            if (!session.hasActiveGame()) throw new Error('Aucune partie active.')
            await session.save(value)
            setMessage({ type: 'success', text: `Sauvegardé: ${value}` })
          }, [`--file=${value}`])
        }
        return
      }

      if (key.escape) {
        setPromptMode(null)
        setPromptValue('')
        return
      }

      if (key.backspace || key.delete) {
        setPromptValue((current) => current.slice(0, -1))
        return
      }

      if (!key.ctrl && !key.meta && input) setPromptValue((current) => current + input)
      return
    }

    if (input === 'q' || key.escape || (key.ctrl && input === 'c')) return exit()

    if (input === 'n') {
      setPromptMode('new')
      setPromptValue('')
      setMessage({ type: 'info', text: 'Entrez les joueurs: Alice,Bob' })
      return
    }
    if (input === 'l') {
      setPromptMode('load')
      setPromptValue('')
      setMessage({ type: 'info', text: 'Entrez le chemin du fichier à charger' })
      return
    }
    if (input === 'r') {
      setPromptMode('roll')
      setPromptValue('')
      setMessage({ type: 'info', text: 'Entrez le lancer: 1,2,3,4,5' })
      return
    }
    if (input === 'k') {
      setPromptMode('keep')
      setPromptValue('')
      setMessage({ type: 'info', text: 'Entrez les dés gardés: 1,5' })
      return
    }
    if (input === 'w') {
      setPromptMode('save')
      setPromptValue('')
      setMessage({ type: 'info', text: 'Entrez le chemin du fichier à sauvegarder' })
      return
    }

    if (input === 's') {
      execute('stop', () => {
        if (!session.hasActiveGame()) throw new Error('Aucune partie active.')
        session.stop()
        setMessage({ type: 'success', text: 'Tour arrêté' })
      })
      return
    }

    if (input === 'f') {
      execute('fail', () => {
        if (!session.hasActiveGame()) throw new Error('Aucune partie active.')
        session.fail('bust')
        setMessage({ type: 'success', text: 'Échec forcé: bust' })
      }, ['--reason=bust'])
    }
  })

  const recentHistory = session.getRecentHistory(8)

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text color="greenBright">centmille TUI (ink)</Text>
      <Text color="gray">q quitter | n nouvelle | l charger | r lancer | k garder | s stop | f échec | w sauver</Text>
      <Text color={message.type === 'error' ? 'red' : message.type === 'success' ? 'green' : 'yellow'}>
        {message.text}
      </Text>

      {promptMode && (
        <Text color="cyan">
          {promptMode}&gt; {promptValue}
        </Text>
      )}

      <Box borderStyle="round" borderColor="cyan" flexDirection="column" paddingX={1} marginTop={1}>
        <Text color="cyanBright">Scores</Text>
        <Text>Joueur courant: {status.currentPlayer}</Text>
        <Text>Gagnant: {status.winner}</Text>
        {status.scores.map((line) => (
          <Text key={line}>{line}</Text>
        ))}
      </Box>

      <Box borderStyle="round" borderColor="cyan" flexDirection="column" paddingX={1} marginTop={1}>
        <Text color="cyanBright">Tour en cours</Text>
        <Text>Tour actif: {status.activeTurn}</Text>
        <Text>Lancer saisi: {status.stagedRoll}</Text>
      </Box>

      <Box borderStyle="round" borderColor="cyan" flexDirection="column" paddingX={1} marginTop={1}>
        <Text color="cyanBright">Historique de session</Text>
        {recentHistory.length === 0 ? (
          <Text>- aucun</Text>
        ) : (
          recentHistory.map((entry) => {
            const statusLabel = entry.ok ? 'ok' : `erreur: ${entry.error}`
            return (
              <Text key={`${entry.at}-${entry.command}`}>
                - {entry.command} {entry.args.join(' ')} | {statusLabel}
              </Text>
            )
          })
        )}
      </Box>
    </Box>
  )
}

export const startTui = () => render(<App />)
