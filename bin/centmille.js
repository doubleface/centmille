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
  status                         Show current session status (placeholder)
  help                           Show this help
`)
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
    console.log('Status command is ready (implementation pending)')
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
