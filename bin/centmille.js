#!/usr/bin/env node

const [, , command, ...args] = process.argv

const parseKeyValueArgs = (rawArgs) => {
  const values = {}

  for (const arg of rawArgs) {
    if (!arg.startsWith('--')) continue

    const [key, value] = arg.slice(2).split('=')
    values[key] = value ?? true
  }

  return values
}

const printHelp = () => {
  console.log(`centmille CLI

Usage:
  centmille <command> [options]

Commands:
  new --players=Alice,Bob       Create a new game session
  load --file=./save.json       Load a game session from JSON
  status                         Show current session status
  roll --dice=1,2,3,4,5         Register a roll
  keep --dice=1,5               Keep scoring dice from current roll
  stop                           Stop current turn
  fail [--reason=bust]           Force a failed turn
  save --file=./save.json        Save current session to JSON
  quit                           Exit CLI session
  help                           Show this help
`)
}

const parseDiceArg = (rawDice) => {
  if (typeof rawDice !== 'string' || rawDice.trim().length === 0) return null

  const dice = rawDice
    .split(',')
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isInteger(value))

  return dice.length > 0 ? dice : null
}

const parsedArgs = parseKeyValueArgs(args)

switch (command) {
  case 'new': {
    const playersRaw = parsedArgs.players

    if (typeof playersRaw !== 'string' || playersRaw.trim().length === 0) {
      console.error('Missing required option: --players=Alice,Bob')
      process.exit(1)
    }

    const players = playersRaw
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean)

    if (players.length < 2) {
      console.error('At least 2 players are required')
      process.exit(1)
    }

    console.log(JSON.stringify({ command: 'new', players }, null, 2))
    break
  }

  case 'load': {
    const file = parsedArgs.file

    if (typeof file !== 'string' || file.trim().length === 0) {
      console.error('Missing required option: --file=./save.json')
      process.exit(1)
    }

    console.log(JSON.stringify({ command: 'load', file }, null, 2))
    break
  }

  case 'status':
    console.log(JSON.stringify({ command: 'status' }, null, 2))
    break

  case 'roll': {
    const dice = parseDiceArg(parsedArgs.dice)

    if (!dice) {
      console.error('Missing or invalid option: --dice=1,2,3,4,5')
      process.exit(1)
    }

    console.log(JSON.stringify({ command: 'roll', dice }, null, 2))
    break
  }

  case 'keep': {
    const dice = parseDiceArg(parsedArgs.dice)

    if (!dice) {
      console.error('Missing or invalid option: --dice=1,5')
      process.exit(1)
    }

    console.log(JSON.stringify({ command: 'keep', dice }, null, 2))
    break
  }

  case 'stop':
    console.log(JSON.stringify({ command: 'stop' }, null, 2))
    break

  case 'fail':
    console.log(JSON.stringify({ command: 'fail', reason: parsedArgs.reason ?? 'bust' }, null, 2))
    break

  case 'save': {
    const file = parsedArgs.file

    if (typeof file !== 'string' || file.trim().length === 0) {
      console.error('Missing required option: --file=./save.json')
      process.exit(1)
    }

    console.log(JSON.stringify({ command: 'save', file }, null, 2))
    break
  }

  case 'quit':
    console.log(JSON.stringify({ command: 'quit' }, null, 2))
    break

  case 'help':
  case undefined:
    printHelp()
    break

  default:
    console.error(`Unknown command: ${command}`)
    printHelp()
    process.exit(1)
}
