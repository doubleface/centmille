#!/usr/bin/env node

import readline from 'node:readline'
import { GameEngine, GameState } from '../src/index.js'

const [, , command, ...args] = process.argv

let engine = null
let pendingRollDice = null

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

const ensureEngine = () => {
  if (engine) return true
  console.error('No active game. Start one with: new --players=Alice,Bob')
  return false
}

const printHelp = () => {
  console.log(`centmille CLI

Usage:
  centmille <command> [options]

Commands:
  new --players=Alice,Bob       Create a new game session
  load --snapshot='{"...":...}' Load game state snapshot JSON
  status                         Show current session status
  roll --dice=1,2,3,4,5         Register a roll (staged)
  keep --dice=1,5               Keep scoring dice from current roll
  stop                           Stop current turn
  fail [--reason=bust]           Force a failed turn
  save                           Print current snapshot JSON
  interactive                    Start interactive CLI loop
  quit                           Exit CLI session
  help                           Show this help
`)
}

const runCommand = (inputCommand, inputArgs = []) => {
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
        const rawSnapshot = parsedArgs.snapshot

        if (typeof rawSnapshot !== 'string' || rawSnapshot.trim().length === 0) {
          console.error('Missing required option: --snapshot={...}')
          process.exitCode = 1
          break
        }

        const snapshot = JSON.parse(rawSnapshot)
        const gameState = GameState.fromSnapshot(snapshot)
        engine = new GameEngine(gameState)
        pendingRollDice = null
        console.log(JSON.stringify({ command: 'load', loaded: true }, null, 2))
        break
      }

      case 'status': {
        if (!ensureEngine()) {
          process.exitCode = 1
          break
        }

        console.log(
          JSON.stringify(
            {
              command: 'status',
              pendingRollDice,
              snapshot: engine.dispatch({ type: 'snapshot' }),
            },
            null,
            2
          )
        )
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

        const snapshot = engine.dispatch({ type: 'snapshot' })
        console.log(JSON.stringify({ command: 'save', snapshot }, null, 2))
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

  rl.on('line', (line) => {
    const trimmed = line.trim()

    if (trimmed.length === 0) {
      rl.prompt()
      return
    }

    const [interactiveCommand, ...interactiveArgs] = trimmed.split(/\s+/)
    const normalizedCommand = interactiveCommand === 'exit' ? 'quit' : interactiveCommand

    if (normalizedCommand === 'quit') {
      runCommand('quit')
      rl.close()
      return
    }

    runCommand(normalizedCommand, interactiveArgs)
    rl.prompt()
  })

  rl.on('close', () => {
    console.log('Goodbye')
  })
}

runCommand(command, args)
