// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { STORAGE_KEY } from '../storage/storage.js'
import { useGame } from './useGame.js'

afterEach(() => {
  window.localStorage.clear()
})

describe('useGame', () => {
  it('persists and restores a game snapshot', () => {
    const { result, unmount } = renderHook(() => useGame())

    act(() => {
      result.current.startGame(['Alice', 'Bob'])
    })

    act(() => {
      result.current.recordTurn(500)
    })

    expect(window.localStorage.getItem(STORAGE_KEY)).toBeTruthy()

    unmount()
    const restored = renderHook(() => useGame())

    expect(restored.result.current.snapshot?.players[0].score).toBe(500)
    expect(restored.result.current.snapshot?.currentPlayerIndex).toBe(1)
  })

  it('supports bust, undo and reset', () => {
    const { result } = renderHook(() => useGame())

    act(() => {
      result.current.startGame(['Alice', 'Bob'])
    })
    act(() => {
      result.current.recordTurn(500)
    })
    act(() => {
      result.current.recordBust()
    })

    expect(result.current.snapshot?.events.at(-1)?.type).toBe('bust')

    act(() => {
      result.current.undoLastEvent()
    })
    expect(result.current.snapshot?.events.at(-1)?.type).toBe('score')

    act(() => {
      result.current.resetGame()
    })
    expect(result.current.snapshot).toBeNull()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('undoes multiple events in sequence', () => {
    const { result } = renderHook(() => useGame())

    act(() => {
      result.current.startGame(['Alice', 'Bob'])
    })
    act(() => {
      result.current.recordTurn(500)
    })
    act(() => {
      result.current.recordBust()
    })

    act(() => {
      result.current.undoLastEvent()
    })
    expect(result.current.snapshot?.events).toHaveLength(1)
    expect(result.current.snapshot?.events.at(-1)?.type).toBe('score')

    act(() => {
      result.current.undoLastEvent()
    })
    expect(result.current.snapshot?.events).toHaveLength(0)
    expect(result.current.snapshot?.players[0].score).toBe(0)
    expect(result.current.snapshot?.currentPlayerIndex).toBe(0)
  })

  it('throws when acting without active game', () => {
    const { result } = renderHook(() => useGame())

    expect(() => result.current.recordTurn(500)).toThrow('No active game')
    expect(() => result.current.recordBust()).toThrow('No active game')
    expect(() => result.current.undoLastEvent()).toThrow('No active game')
  })

  it('clears storage when snapshot cannot be restored', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        metadata: { game: 'centmille', formatVersion: 2, mode: 'manual' },
        snapshot: { players: [] },
      })
    )

    const { result } = renderHook(() => useGame())

    expect(result.current.snapshot).toBeNull()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
