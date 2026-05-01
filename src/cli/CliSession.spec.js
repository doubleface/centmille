import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CliSession } from './CliSession.js'

describe('CliSession', () => {
  it('starts a game and dispatches actions to the engine', () => {
    const session = new CliSession()
    session.newGame(['Alice', 'Bob'])

    session.dispatch({ type: 'start_turn' })
    const recordResult = session.dispatch({ type: 'record_roll', rolledDice: [1, 5, 2, 3, 4] })
    expect(recordResult.type).toBe('rolled')
    expect(session.getSnapshot().pendingRoll).toEqual({ rolledDice: [1, 5, 2, 3, 4] })

    const keepResult = session.dispatch({ type: 'keep', keptDice: [1, 5] })
    expect(keepResult.type).toBe('roll')
    expect(session.getSnapshot().pendingRoll).toBeNull()
  })

  it('saves and loads a snapshot', async () => {
    const session = new CliSession()
    session.newGame(['Alice', 'Bob'])
    const dir = mkdtempSync(join(tmpdir(), 'centmille-session-'))
    const file = join(dir, 'save.json')

    const saved = await session.save(file)
    expect(saved.filePath).toContain('save.json')

    const restored = new CliSession()
    await restored.load(file)
    expect(restored.hasActiveGame()).toBe(true)
    expect(restored.getSnapshot().players.map((p) => p.name)).toEqual(['Alice', 'Bob'])
  })

  it('tracks bounded history and returns recent entries', () => {
    const session = new CliSession()
    for (let i = 0; i < 205; i += 1) {
      session.addHistory({ id: i })
    }

    expect(session.history).toHaveLength(200)
    expect(session.history[0].id).toBe(5)
    expect(session.getRecentHistory(3).map((entry) => entry.id)).toEqual([202, 203, 204])
  })
})
