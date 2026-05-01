import { Box, render, Text, useApp, useInput } from 'ink'
import React, { useState } from 'react'
import { CliSession } from '../cli/CliSession.js'
import { DiceScorer } from '../rules/DiceScorer.js'
import { selectAutoKeptDice } from './autoKeep.js'
import { DiceView } from './DiceView.jsx'
import { rollDice } from './dice.js'
import { formatStatus, makeStealChoiceInfo, parsePlayersArg } from './helpers.js'

const scorer = new DiceScorer()

const readSnapshot = (session) => (session.hasActiveGame() ? session.getSnapshot() : null)

const App = () => {
  const { exit } = useApp()
  const [session] = useState(() => new CliSession())
  const [snapshot, setSnapshot] = useState(null)
  const [message, setMessage] = useState({ type: 'info', text: 'Prêt' })
  const [promptMode, setPromptMode] = useState(null)
  const [promptValue, setPromptValue] = useState('')
  const [decisionIndex, setDecisionIndex] = useState(0)
  const [stealDecisionIndex, setStealDecisionIndex] = useState(0)
  const [stealChoiceInfo, setStealChoiceInfo] = useState(null)
  const [bustInfo, setBustInfo] = useState(null)

  const recordHistory = (command, args = [], error = null) => {
    session.addHistory({ at: new Date().toISOString(), command, args, ok: error === null, error })
  }

  const advance = () => {
    while (session.hasActiveGame()) {
      const current = session.getSnapshot()
      if (current.phase === 'awaitingDecision' || current.phase === 'gameOver') break

      if (current.phase === 'awaitingTurnStart') {
        const turnStartState = session.dispatch({ type: 'turn_start_state' })
        const nextStealChoiceInfo = makeStealChoiceInfo(current, turnStartState)
        if (nextStealChoiceInfo) {
          setStealChoiceInfo(nextStealChoiceInfo)
          break
        }

        session.dispatch({ type: 'start_turn', steal: false })
        recordHistory('start-turn', ['steal=false'])
        continue
      }

      if (current.phase === 'rolling') {
        const dice = rollDice(current.activeTurn.diceToRoll)
        const result = session.dispatch({ type: 'record_roll', rolledDice: dice })
        recordHistory('roll-auto', [dice.join(',')])
        if (result.type === 'failure') {
          recordHistory('bust')
          if (result.rolledDice) {
            setBustInfo({
              rolledDice: result.rolledDice,
              playerName: result.player.name,
              checkpointDrop: result.checkpointDrop,
            })
            break
          }
        }
        continue
      }

      break
    }

    setSnapshot(readSnapshot(session))
    setDecisionIndex(0)
  }

  const runSync = (label, fn, args = []) => {
    try {
      fn()
      recordHistory(label, args)
      advance()
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error)
      setMessage({ type: 'error', text: `Erreur: ${text}` })
      recordHistory(label, args, text)
      setSnapshot(readSnapshot(session))
    }
  }

  const runAsync = async (label, fn, args = []) => {
    try {
      await fn()
      recordHistory(label, args)
      advance()
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error)
      setMessage({ type: 'error', text: `Erreur: ${text}` })
      recordHistory(label, args, text)
      setSnapshot(readSnapshot(session))
    }
  }

  const submitPrompt = (mode, value) => {
    if (mode === 'new') {
      const players = parsePlayersArg(value)
      if (!players) {
        setMessage({ type: 'error', text: 'Erreur: Joueurs invalides. Utilisez Alice,Bob' })
        return
      }
      runSync('new', () => {
        session.newGame(players)
        setMessage({ type: 'success', text: `Nouvelle partie: ${players.join(', ')}` })
      }, [`--players=${value}`])
      return
    }

    if (mode === 'load') {
      runAsync('load', async () => {
        await session.load(value)
        setMessage({ type: 'success', text: `Chargé: ${value}` })
      }, [`--file=${value}`])
      return
    }

    if (mode === 'save') {
      runAsync('save', async () => {
        if (!session.hasActiveGame()) throw new Error('Aucune partie active.')
        await session.save(value)
        setMessage({ type: 'success', text: `Sauvegardé: ${value}` })
      }, [`--file=${value}`])
    }
  }

  useInput((input, key) => {
    if (stealChoiceInfo) {
      if (key.leftArrow || input === 'j') return setStealDecisionIndex(0)
      if (key.rightArrow || input === 'k') return setStealDecisionIndex(1)
      if (key.return) {
        const steal = stealDecisionIndex === 0
        runSync(steal ? 'start-turn-steal' : 'start-turn-no-steal', () => {
          session.dispatch({ type: 'start_turn', steal })
          setStealChoiceInfo(null)
          setStealDecisionIndex(0)
          setMessage({ type: 'success', text: steal ? 'Vol activé' : 'Vol refusé' })
        })
      }
      return
    }

    if (bustInfo) {
      if (key.return) {
        setBustInfo(null)
        advance()
      }
      return
    }

    if (promptMode) {
      if (key.return) {
        const mode = promptMode
        const value = promptValue
        setPromptMode(null)
        setPromptValue('')
        submitPrompt(mode, value)
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

      if (!key.ctrl && !key.meta && input) {
        setPromptValue((current) => current + input)
      }
      return
    }

    if (input === 'q' || (key.ctrl && input === 'c')) return exit()

    if (snapshot?.phase === 'awaitingDecision') {
      if (key.leftArrow || input === 'j') return setDecisionIndex(0)
      if (key.rightArrow || input === 'k') return setDecisionIndex(1)
      if (key.return) {
        const keptDice = selectAutoKeptDice(snapshot.pendingRoll.rolledDice)
        if (keptDice.length === 0) return

        if (decisionIndex === 0) {
          runSync('continue', () => {
            session.dispatch({ type: 'keep', keptDice })
            setMessage({ type: 'success', text: `Continue: dés gardés ${keptDice.join(',')}` })
          })
          return
        }

        runSync('stop', () => {
          session.dispatch({ type: 'keep', keptDice })
          session.dispatch({ type: 'stop_turn' })
          setMessage({ type: 'success', text: 'Tour arrêté' })
        })
        return
      }
      return
    }

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
    if (input === 'w' && snapshot) {
      setPromptMode('save')
      setPromptValue('')
      setMessage({ type: 'info', text: 'Entrez le chemin du fichier à sauvegarder' })
    }
  })

  const status = formatStatus(snapshot)
  const pendingRoll = snapshot?.pendingRoll
  const autoKeptDice = pendingRoll ? selectAutoKeptDice(pendingRoll.rolledDice) : []
  const keptScore = autoKeptDice.length > 0 ? scorer.scoreRoll(autoKeptDice).score : 0
  const projectedTurnScore = (snapshot?.activeTurn?.turnScore ?? 0) + keptScore
  const stop = snapshot?.stop
  const recentHistory = session.getRecentHistory(8)
  const isDecision = snapshot?.phase === 'awaitingDecision'
  const isStealChoice = Boolean(stealChoiceInfo)
  const isGameOver = snapshot?.phase === 'gameOver'

  const keyHints = isStealChoice || isDecision
    ? '←/→ ou j/k naviguer | Entrée valider | w sauver | q quitter'
    : 'n nouvelle | l charger | w sauver | q quitter'

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text color="greenBright">centmille TUI (ink)</Text>
      <Text color="gray">{keyHints}</Text>
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
        {status.scores.map((line, index) => (
          <Text key={`score-${index}`}>{line}</Text>
        ))}
      </Box>

      <Box borderStyle="round" borderColor="cyan" flexDirection="column" paddingX={1} marginTop={1}>
        <Text color="cyanBright">Tour en cours</Text>
        <Text>Tour actif: {status.activeTurn}</Text>
        <Text>Lancer: {status.stagedRoll}</Text>
        {isStealChoice && (
          <>
            <Text>
              {stealDecisionIndex === 0 ? '▶ Voler' : '  Voler'} {'   '}
              {stealDecisionIndex === 1 ? '▶ Refuser' : '  Refuser'}
            </Text>
            <Text color="yellow">
              {stealChoiceInfo.playerName}, reprendre {stealChoiceInfo.carriedScore} pts avec{' '}
              {stealChoiceInfo.diceToRoll} dé(s) ?
            </Text>
          </>
        )}
        {isDecision && (
          <Text>
            Score projeté: {projectedTurnScore} (gardés: {autoKeptDice.join(',') || 'aucun'})
          </Text>
        )}
        <DiceView rolledDice={pendingRoll?.rolledDice ?? []} selectedDice={autoKeptDice} />
        {isDecision && (
          <>
            <Text>
              {decisionIndex === 0 ? '▶ Continuer' : '  Continuer'}
              {'   '}
              <Text color={stop?.canStop ? 'white' : 'gray'}>
                {decisionIndex === 1 ? '▶ Arrêter' : '  Arrêter'}
              </Text>
            </Text>
            {stop?.blockedReason && <Text color="yellow">Arrêt impossible: {stop.blockedReason}</Text>}
            {stop?.warning && <Text color="yellow">⚠ {stop.warning}</Text>}
          </>
        )}
        {bustInfo && (
          <>
            <Text color="red">Bust ! {bustInfo.playerName} — aucun dé scorant</Text>
            {bustInfo.checkpointDrop && <Text color="red">Retour au checkpoint précédent !</Text>}
            <DiceView rolledDice={bustInfo.rolledDice} selectedDice={[]} />
            <Text color="gray">Appuyez sur Entrée pour passer la main</Text>
          </>
        )}
        {isGameOver && (
          <Text color="greenBright">Partie terminée — gagnant: {status.winner}</Text>
        )}
      </Box>

      <Box borderStyle="round" borderColor="cyan" flexDirection="column" paddingX={1} marginTop={1}>
        <Text color="cyanBright">Historique de session</Text>
        {recentHistory.length === 0 ? (
          <Text>- aucun</Text>
        ) : (
          recentHistory.map((entry, index) => {
            const statusLabel = entry.ok ? 'ok' : `erreur: ${entry.error}`
            return (
              <Text key={`history-${index}`}>
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
