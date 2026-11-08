import { fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FakeAudioContext } from './FakeAudioContext.js'
import { formatRatings, loadRatings, mountSoundLab, RATINGS_KEY } from './soundLab.js'

const makeStorage = (initial = {}) => {
  const data = { ...initial }
  return {
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value
    },
  }
}

describe('sound lab', () => {
  let root
  let contexts

  beforeEach(() => {
    root = document.createElement('div')
    document.body.append(root)
    contexts = []
  })

  afterEach(() => root.remove())

  const mount = (storage = makeStorage(), createContext) =>
    mountSoundLab(root, {
      storage,
      createContext:
        createContext ??
        (() => {
          const ctx = new FakeAudioContext()
          contexts.push(ctx)
          return ctx
        }),
    })

  it('plays a sound with a single lazily created context', () => {
    mount()
    expect(contexts.length).toBe(0)
    fireEvent.click(screen.getByTestId('play-bomb'))
    fireEvent.click(screen.getByTestId('play-mirror'))
    expect(contexts.length).toBe(1)
    expect(contexts[0].started.length).toBeGreaterThan(0)
    expect(contexts[0].resumed).toBe(2)
  })

  it('returns false for unknown sounds or missing audio support', () => {
    expect(mount().play('nope')).toBe(false)
    expect(mount(makeStorage(), () => null).play('bomb')).toBe(false)
    expect(mountSoundLab(root, { storage: makeStorage() }).play('bomb')).toBe(false)
    window.AudioContext = FakeAudioContext
    expect(mountSoundLab(root).play('bomb')).toBe(true)
    delete window.AudioContext
  })

  it('updates the master volume', () => {
    mount()
    fireEvent.click(screen.getByTestId('play-bomb'))
    fireEvent.input(screen.getByTestId('volume'), { target: { value: '0.3' } })
    expect(screen.getByTestId('volume').value).toBe('0.3')
  })

  it('persists verdicts and comments, and restores them', () => {
    const storage = makeStorage()
    mount(storage)
    fireEvent.click(screen.getByTestId('verdict-bomb-keep'))
    fireEvent.click(screen.getByTestId('verdict-bomb-drop'))
    fireEvent.input(screen.getByTestId('comment-bomb'), { target: { value: 'trop fort' } })

    expect(loadRatings(storage)).toEqual({ bomb: { verdict: 'drop', comment: 'trop fort' } })
    expect(screen.getByTestId('verdict-bomb-drop').classList.contains('selected')).toBe(true)
    expect(screen.getByTestId('verdict-bomb-keep').classList.contains('selected')).toBe(false)

    mount(storage)
    expect(screen.getByTestId('comment-bomb').value).toBe('trop fort')
    expect(screen.getByTestId('verdict-bomb-drop').classList.contains('selected')).toBe(true)
  })

  it('exports a readable summary', () => {
    mount(
      makeStorage({
        [RATINGS_KEY]: JSON.stringify({ sniper: { verdict: 'rework', comment: 'plus court' } }),
      })
    )
    fireEvent.click(screen.getByTestId('export-button'))
    const text = screen.getByTestId('export').value
    expect(text).toContain('Sniper 🎯 (sniper) → 🔧 À retravailler : plus court')
    expect(text).toContain('(bomb) → — pas noté')
  })

  it('ignores corrupted storage', () => {
    expect(loadRatings(makeStorage({ [RATINGS_KEY]: '{oops' }))).toEqual({})
    expect(formatRatings({})).toContain('pas noté')
  })
})
