// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import {
  clearCurrentGame,
  loadCurrentGame,
  makeManualSavePayload,
  STORAGE_KEY,
  saveCurrentGame,
} from './storage.js'

afterEach(() => {
  window.localStorage.clear()
})

describe('web storage', () => {
  it('builds, saves and loads a manual payload', () => {
    const snapshot = { players: [{ name: 'Alice' }, { name: 'Bob' }] }
    const payload = makeManualSavePayload(snapshot)

    expect(payload.metadata.mode).toBe('manual')

    const saved = saveCurrentGame(snapshot)
    expect(saved?.metadata.game).toBe('centmille')

    const loaded = loadCurrentGame()
    expect(loaded?.snapshot).toEqual(snapshot)
  })

  it('returns null for invalid payload variants', () => {
    window.localStorage.setItem(STORAGE_KEY, '{invalid')
    expect(loadCurrentGame()).toBeNull()

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ metadata: {}, snapshot: {} }))
    expect(loadCurrentGame()).toBeNull()

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        metadata: { game: 'centmille', formatVersion: 2, mode: 'manual' },
        snapshot: null,
      })
    )
    expect(loadCurrentGame()).toBeNull()
  })

  it('clears persisted game', () => {
    saveCurrentGame({ players: [] })
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeTruthy()

    clearCurrentGame()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
