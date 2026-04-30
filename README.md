# centmille

Technical rules engine for the dice game "10 000".

## Stack

- Node.js (ES modules)
- Vitest for unit tests
- Biome for formatting/linting

## Project structure

- `src/rules/DiceScorer.js`: computes score for a dice set.
- `src/rules/TurnRules.js`: turn-level constraints (open threshold, stop condition, exact win, overshoot).
- `src/game/PlayerState.js`: player score/checkpoint/failure streak state.
- `src/game/GameState.js`: multiplayer game state and turn flow.
- `src/game/GameEngine.js`: action dispatcher/orchestration layer over `GameState`.

Tests are colocated next to implementation files as `*.spec.js`.

## Implemented rules

### Scoring

- Single `1` = 100
- Single `5` = 50
- Three of a kind:
  - `1,1,1` = 1000
  - `N,N,N` = `N * 100` for other values
- Four of a kind = three-of-a-kind score × 2
- Five of a kind = four-of-a-kind score × 2
- Straight `1..5` or `2..6` = 1500

### Turn / game constraints

- Opening requires at least 500 points.
- A player can stop only on a multiple of 100.
- Overshoot over target score (default 10,000) counts as a failed turn.
- 3 consecutive failed turns drop player to previous checkpoint.
- Score collision drops the collided player to previous checkpoint; chain reactions are supported.
- Steal/reprise is supported via carried score + remaining dice from last validated turn.
- If previous player stopped with 0 remaining dice, next player restarts with full dice.

## State orchestration

`GameEngine.dispatch(action)` supports:

- `start_turn`
- `roll` (`rolledDice`, `keptDice`)
- `stop_turn`
- `force_failure`
- `snapshot`

## Serialization API

`GameState` exposes:

- `getSnapshot()` -> JSON-serializable state
- `GameState.fromSnapshot(snapshot)` -> restore game from snapshot

## Commands

- `npm test`
- `npm run check`
- `npm run format`
- `npm run lint`
