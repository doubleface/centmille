import { describe, expect, it } from 'vitest'
import { GameEngine } from './GameEngine.js'

describe('GameEngine', () => {
  it('orchestrates start, roll and stop actions', () => {
    const engine = GameEngine.create(['Alice', 'Bob'])

    const startResult = engine.dispatch({ type: 'start_turn' })
    expect(startResult.diceToRoll).toBe(5)

    const rollResult = engine.dispatch({
      type: 'roll',
      rolledDice: [5, 5, 5, 2, 2],
      keptDice: [5, 5, 5],
    })
    expect(rollResult.turnScore).toBe(500)

    const stopResult = engine.dispatch({ type: 'stop_turn' })
    expect(stopResult.type).toBe('validated')
    expect(engine.getState().getCurrentPlayer().name).toBe('Bob')
  })

  it('returns a snapshot through dispatch', () => {
    const engine = GameEngine.create(['Alice', 'Bob'])

    const snapshot = engine.dispatch({ type: 'snapshot' })

    expect(snapshot.players).toHaveLength(2)
    expect(snapshot.currentPlayerIndex).toBe(0)
  })

  it('throws on unknown action', () => {
    const engine = GameEngine.create(['Alice', 'Bob'])

    expect(() => engine.dispatch({ type: 'unknown' })).toThrow('Unknown action type: unknown')
  })
})
