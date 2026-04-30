#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import readline from 'node:readline'
import { GameEngine, GameState } from '../src/index.js'

const [, , command, ...args] = process.argv

let engine = null
let pendingRollDice = null
let isQuitting = false

const parseKeyValueArgs = (rawArgs) => {
  const values = {}

  for (const arg of rawArgs) {
    if (!arg.startsWith('--')) continue

    const [key, value] = arg.slice(2).split('=')
    values[key] = value ?? true
  }

  return values
}

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

const validateSavePayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid save file: root JSON object expected')
  }

  if (!payload.metadata || typeof payload.metadata !== 'object') {
    throw new Error('Invalid save file: missing metadata object')
  }

  if (payload.metadata.game !== 'centmille') {
    throw new Error('Invalid save file: metadata.game must be "centmille"')
  }

  if (payload.metadata.formatVersion !== 1) {
    throw new Error('Invalid save file: unsupported formatVersion')
  }

  if (!payload.snapshot || typeof payload.snapshot !== 'object') {
    throw new Error('Invalid save file: missing snapshot object')
  }
}

const ensureEngine = () => {
  if (engine) return true
  console.error('No active game. Start one with: new --players=Alice,Bob')
  return false
}

const formatStatus = (snapshot, stagedDice) => {
  const currentPlayer = snapshot.players[snapshot.currentPlayerIndex]
  const activeTurn = snapshot.activeTurn

  const scoreLines = snapshot.players
    .map((player, index) => {
      const marker = index === snapshot.currentPlayerIndex ? '>' : ' '
      const history = Array.isArray(player.checkpointHistory)
        ? player.checkpointHistory.join(' -> ')
        : 'n/a'
      return `${marker} ${player.name}: ${player.score} pts (fails: ${player.failedTurnsInRow}) | history: ${history}`
    })
    .join('\n')

  const activeTurnLabel = activeTurn
    ? `turnScore=${activeTurn.turnScore}, diceToRoll=${activeTurn.diceToRoll}, canSteal=${activeTurn.canSteal}`
    : 'none'

  const winnerLabel = snapshot.winnerIndex === null ? 'none' : snapshot.players[snapshot.winnerIndex].name

  return [
    '=== Game Status ===',
    `Current player: ${currentPlayer.name}`,
    `Winner: ${winnerLabel}`,
    `Active turn: ${activeTurnLabel}`,
    `Staged roll: ${stagedDice ? stagedDice.join(',') : 'none'}`,
    'Scores:',
    scoreLines,
  ].join('\n')
}

const printHelp = () => {
  console.log(`centmille CLI

Usage:
  centmille <command> [options]

Commands:
  new --players=Alice,Bob       Create a new game session
  load --file=./save.json        Load game state from JSON file
  status                         Show current session status
  roll --dice=1,2,3,4,5         Register a roll (staged)
  keep --dice=1,5               Keep scoring dice from current roll
  stop                           Stop current turn
  fail [--reason=bust]           Force a failed turn
  save --file=./save.json        Save current session to JSON file
  interactive                    Start interactive CLI loop
  quit                           Exit CLI session
  help                           Show this help
`)
}

const runCommand = async (inputCommand, inputArgs = []) => {
  const parsedArgs = parseKeyValueArgs(inputArgs)

  try {
    switch (inputCommand) {
      case 'new': {
        const players = parsePlayersArg(parsedArgs.players)

        if (!players) {
          console.error('Missing or invalid option: --players=Alice,Bob (at least 2)')
          process.exitCode = 1
          break
        }

        engine = GameEngine.create(players)
        pendingRollDice = null
        console.log(JSON.stringify({ command: 'new', players }, null, 2))
        break
      }

      case 'load': {
        const file = parsedArgs.file

        if (typeof file !== 'string' || file.trim().length === 0) {
          console.error('Missing required option: --file=./save.json')
          process.exitCode = 1
          break
        }

        const filePath = resolve(file)
        const rawContent = await readFile(filePath, 'utf-8')
        const payload = JSON.parse(rawContent)

        validateSavePayload(payload)

        const gameState = GameState.fromSnapshot(payload.snapshot)
        engine = new GameEngine(gameState)
        pendingRollDice = null
        console.log(JSON.stringify({ command: 'load', file: filePath, loaded: true }, null, 2))
        break
      }

      case 'status': {
        if (!ensureEngine()) {
          process.exitCode = 1
          break
        }

        const snapshot = engine.dispatch({ type: 'snapshot' })
        console.log(formatStatus(snapshot, pendingRollDice))
        break
      }

      case 'roll': {
        if (!ensureEngine()) {
          process.exitCode = 1
          break
        }

        const dice = parseDiceArg(parsedArgs.dice)

        if (!dice) {
          console.error('Missing or invalid option: --dice=1,2,3,4,5')
          process.exitCode = 1
          break
        }

        if (!engine.getState().getActiveTurn()) {
          engine.dispatch({ type: 'start_turn' })
        }

        pendingRollDice = dice
        console.log(JSON.stringify({ command: 'roll', dice, staged: true }, null, 2))
        break
      }

      case 'keep': {
        if (!ensureEngine()) {
          process.exitCode = 1
          break
        }

        const keptDice = parseDiceArg(parsedArgs.dice)

        if (!pendingRollDice) {
          console.error('No staged roll. Use: roll --dice=... first')
          process.exitCode = 1
          break
        }

        if (!keptDice) {
          console.error('Missing or invalid option: --dice=1,5')
          process.exitCode = 1
          break
        }

        const result = engine.dispatch({
          type: 'roll',
          rolledDice: pendingRollDice,
          keptDice,
        })

        pendingRollDice = null
        console.log(JSON.stringify({ command: 'keep', keptDice, result }, null, 2))
        break
      }

      case 'stop': {
        if (!ensureEngine()) {
          process.exitCode = 1
          break
        }

        const result = engine.dispatch({ type: 'stop_turn' })
        pendingRollDice = null
        console.log(JSON.stringify({ command: 'stop', result }, null, 2))
        break
      }

      case 'fail': {
        if (!ensureEngine()) {
          process.exitCode = 1
          break
        }

        const result = engine.dispatch({
          type: 'force_failure',
          reason: parsedArgs.reason ?? 'bust',
        })
        pendingRollDice = null
        console.log(JSON.stringify({ command: 'fail', result }, null, 2))
        break
      }

      case 'save': {
        if (!ensureEngine()) {
          process.exitCode = 1
          break
        }

        const file = parsedArgs.file
        if (typeof file !== 'string' || file.trim().length === 0) {
          console.error('Missing required option: --file=./save.json')
          process.exitCode = 1
          break
        }

        const filePath = resolve(file)
        const payload = {
          metadata: {
            formatVersion: 1,
            game: 'centmille',
            savedAt: new Date().toISOString(),
            source: 'cli',
          },
          snapshot: engine.dispatch({ type: 'snapshot' }),
        }

        await mkdir(dirname(filePath), { recursive: true })
        await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8')

        console.log(JSON.stringify({ command: 'save', file: filePath, saved: true }, null, 2))
        break
      }

      case 'quit':
        console.log(JSON.stringify({ command: 'quit' }, null, 2))
        break

      case 'interactive': {
        startInteractiveMode()
        break
      }

      case 'help':
      case undefined:
        printHelp()
        break

      default:
        console.error(`Unknown command: ${inputCommand}`)
        printHelp()
        process.exitCode = 1
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}

const startInteractiveMode = () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'centmille> ',
  })

  console.log('Interactive mode started. Type "help" for commands, "quit" to exit.')
  rl.prompt()

  rl.on('line', async (line) => {
    if (isQuitting) {
      return
    }

    const trimmed = line.trim()

    if (trimmed.length === 0) {
      rl.prompt()
      return
    }

    const [interactiveCommand, ...interactiveArgs] = trimmed.split(/\s+/)
    const normalizedCommand = interactiveCommand === 'exit' ? 'quit' : interactiveCommand

    if (normalizedCommand === 'quit') {
      isQuitting = true
      await runCommand('quit')
      rl.close()
      return
    }

    await runCommand(normalizedCommand, interactiveArgs)
    if (!rl.closed) {
      rl.prompt()
    }
  })

  rl.on('close', () => {
    console.log('Goodbye')
    isQuitting = false
  })
}

await runCommand(command, args)
