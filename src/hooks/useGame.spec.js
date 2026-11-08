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

  it('returns null when undoLastEvent has nothing to undo', () => {
    const { result } = renderHook(() => useGame())

    act(() => {
      result.current.startGame(['Alice', 'Bob'])
    })

    let undoResult
    act(() => {
      undoResult = result.current.undoLastEvent()
    })

    expect(undoResult).toBeNull()
  })

  it('throws when acting without active game', () => {
    const { result } = renderHook(() => useGame())

    expect(() => result.current.recordTurn(500)).toThrow('No active game')
    expect(() => result.current.recordBust()).toThrow('No active game')
    expect(() => result.current.playCard('effaceur')).toThrow('No active game')
    expect(() => result.current.resolvePendingInteraction({})).toThrow('No active game')
    expect(() => result.current.undoLastEvent()).toThrow('No active game')
  })

  it('supports cent-mille mode, playCard, and resolvePendingInteraction', () => {
    const { result } = renderHook(() => useGame())

    act(() => {
      result.current.startGame(['Alice', 'Bob'], {
        mode: 'cent-mille',
        redZoneEnabled: true,
        shopEnabled: true,
      })
    })

    expect(result.current.snapshot?.mode).toBe('cent-mille')
    expect(result.current.game?.modeConfig.redZoneEnabled).toBe(true)

    // Give Alice a card to play
    act(() => {
      result.current.game.giveCardToPlayer(0, 'effaceur')
    })

    let actionEvents
    act(() => {
      actionEvents = result.current.playCard('effaceur')
    })

    expect(actionEvents).toBeDefined()
    expect(result.current.snapshot?.players[0].hand).not.toContain('effaceur')

    // Add a pending interaction and resolve it
    act(() => {
      result.current.game.pendingInteractions.push({
        type: 'answer-42',
        playerIndex: 0,
        choices: ['bouclier', 'doubleur'],
      })
    })

    let resolvedEvents
    act(() => {
      resolvedEvents = result.current.resolvePendingInteraction({ cardId: 'bouclier' })
    })

    expect(resolvedEvents).toBeDefined()
    expect(result.current.snapshot?.players[0].hand).toContain('bouclier')
    expect(result.current.snapshot?.pendingInteractions).toHaveLength(0)
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
