import { Box, render, Text, useApp, useInput } from 'ink'
import React, { useEffect, useMemo, useState } from 'react'
import { CliSession } from '../cli/CliSession.js'
import { selectAutoKeptDice } from './autoKeep.js'
import { DiceView } from './DiceView.jsx'
import { formatStatus, parsePlayersArg } from './helpers.js'
import { rollDice } from './dice.js'

const App = () => {
  const { exit } = useApp()
  const [session] = useState(() => new CliSession())
  const [message, setMessage] = useState({ type: 'info', text: 'Prêt' })
  const [promptMode, setPromptMode] = useState(null)
  const [promptValue, setPromptValue] = useState('')
  const [version, setVersion] = useState(0)
  const [decisionIndex, setDecisionIndex] = useState(0)

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

  const status = useMemo(() => {
    const hasActiveGame = session.hasActiveGame()
    return formatStatus({
      hasActiveGame,
      snapshot: hasActiveGame ? session.getSnapshot() : null,
      pendingRollDice: session.pendingRollDice,
    })
  }, [session, version])

  const runAutoRoll = () => {
    if (!session.hasActiveGame()) throw new Error('Aucune partie active.')

    const snapshot = session.getSnapshot()
    const diceToRoll = snapshot.activeTurn?.diceToRoll ?? 5
    const dice = rollDice(diceToRoll)

    session.stageRoll(dice)
    setMessage({ type: 'success', text: `Lancer auto: ${dice.join(',')}` })
  }

  useEffect(() => {
    if (!promptMode && session.hasActiveGame() && !session.pendingRollDice) {
      execute('roll-auto', () => {
        runAutoRoll()
      })
    }
  }, [promptMode, session, version])

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
    if (session.hasActiveGame() && session.pendingRollDice) {
      if (key.leftArrow || input === 'j') {
        setDecisionIndex(0)
        return
      }

      if (key.rightArrow || input === 'k') {
        setDecisionIndex(1)
        return
      }

      if (key.return) {
        const keptDice = selectAutoKeptDice(session.pendingRollDice)
        if (keptDice.length === 0) {
          execute('fail', () => {
            session.fail('bust')
            setMessage({ type: 'error', text: 'Aucun dé scorant: tour échoué.' })
          })
          return
        }

        if (decisionIndex === 0) {
          execute('continue', () => {
            session.keep(keptDice)
            runAutoRoll()
            setMessage({ type: 'success', text: `Continue: dés gardés ${keptDice.join(',')}` })
          })
          return
        }

        execute('stop', () => {
          session.keep(keptDice)
          session.stop()
          setMessage({ type: 'success', text: 'Tour arrêté' })
        })
      }

      return
    }
    if (input === 'w') {
      setPromptMode('save')
      setPromptValue('')
      setMessage({ type: 'info', text: 'Entrez le chemin du fichier à sauvegarder' })
      return
    }

  })

  const autoKeptDice = session.pendingRollDice ? selectAutoKeptDice(session.pendingRollDice) : []
  const recentHistory = session.getRecentHistory(8)

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text color="greenBright">centmille TUI (ink)</Text>
      <Text color="gray">q quitter | n nouvelle | l charger | w sauver</Text>
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
        <Text>Dés préselectionnés: {autoKeptDice.length > 0 ? autoKeptDice.join(',') : 'aucun'}</Text>
        <DiceView rolledDice={session.pendingRollDice} selectedDice={autoKeptDice} />
        {session.pendingRollDice && (
          <Text>
            {decisionIndex === 0 ? '▶ Continuer' : '  Continuer'}   {decisionIndex === 1 ? '▶ Arrêter' : '  Arrêter'}
            {'  '} (←/→ ou j/k, Entrée pour valider)
          </Text>
        )}
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
