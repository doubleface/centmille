import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FakeAudioContext } from './FakeAudioContext.js'
import soundPlayerDefault, {
  createSoundPlayer,
  MUTE_STORAGE_KEY,
  playSound,
  soundPlayer,
} from './soundPlayer.js'

const makeStorage = (initial = {}) => {
  const data = { ...initial }
  return {
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = String(value)
    },
  }
}

describe('soundPlayer', () => {
  let contexts

  beforeEach(() => {
    contexts = []
  })

  afterEach(() => {
    delete window.AudioContext
    delete window.webkitAudioContext
    vi.restoreAllMocks()
  })

  const makeContextFactory = () => () => {
    const ctx = new FakeAudioContext()
    contexts.push(ctx)
    return ctx
  }

  it('lazily initializes the audio engine on first play and reuses it', () => {
    const player = createSoundPlayer({
      storage: makeStorage(),
      createContext: makeContextFactory(),
    })

    expect(contexts.length).toBe(0)

    const playedFirst = player.play('bomb')
    expect(playedFirst).toBe(true)
    expect(contexts.length).toBe(1)
    expect(contexts[0].resumed).toBe(1)
    expect(contexts[0].started.length).toBeGreaterThan(0)

    const startedCount = contexts[0].started.length
    const playedSecond = player.play('tier-crossed')
    expect(playedSecond).toBe(true)
    expect(contexts.length).toBe(1)
    expect(contexts[0].resumed).toBe(2)
    expect(contexts[0].started.length).toBeGreaterThan(startedCount)
  })

  it('handles contexts without resume method gracefully', () => {
    const player = createSoundPlayer({
      storage: makeStorage(),
      createContext: () => {
        const ctx = new FakeAudioContext()
        delete ctx.resume
        return ctx
      },
    })

    expect(player.play('bomb')).toBe(true)
  })

  it('returns false for unknown sound IDs and does not initialize engine', () => {
    const player = createSoundPlayer({
      storage: makeStorage(),
      createContext: makeContextFactory(),
    })

    expect(player.play('non-existent-sound')).toBe(false)
    expect(contexts.length).toBe(0)
  })

  it('plays card-flip first when withCardFlip is true', () => {
    const player = createSoundPlayer({
      storage: makeStorage(),
      createContext: makeContextFactory(),
    })

    const played = player.play('rarity-rare', { withCardFlip: true })
    expect(played).toBe(true)
    expect(contexts.length).toBe(1)
    // Card flip generates noise nodes, rarity-rare generates brass/bell/noise
    expect(contexts[0].started.length).toBeGreaterThan(5)
  })

  it('manages muted state and persists to storage', () => {
    const storage = makeStorage()
    const player = createSoundPlayer({
      storage,
      createContext: makeContextFactory(),
    })

    expect(player.isMuted()).toBe(false)

    expect(player.setMuted(true)).toBe(true)
    expect(player.isMuted()).toBe(true)
    expect(storage.getItem(MUTE_STORAGE_KEY)).toBe('true')

    expect(player.toggleMuted()).toBe(false)
    expect(player.isMuted()).toBe(false)
    expect(storage.getItem(MUTE_STORAGE_KEY)).toBe('false')

    expect(player.toggleMuted()).toBe(true)
    expect(player.isMuted()).toBe(true)
    expect(storage.getItem(MUTE_STORAGE_KEY)).toBe('true')
  })

  it('initializes muted state from storage', () => {
    const storageMuted = makeStorage({ [MUTE_STORAGE_KEY]: 'true' })
    const playerMuted = createSoundPlayer({
      storage: storageMuted,
      createContext: makeContextFactory(),
    })
    expect(playerMuted.isMuted()).toBe(true)

    const storageUnmuted = makeStorage({ [MUTE_STORAGE_KEY]: 'false' })
    const playerUnmuted = createSoundPlayer({
      storage: storageUnmuted,
      createContext: makeContextFactory(),
    })
    expect(playerUnmuted.isMuted()).toBe(false)
  })

  it('blocks sound playback when muted', () => {
    const player = createSoundPlayer({
      storage: makeStorage({ [MUTE_STORAGE_KEY]: 'true' }),
      createContext: makeContextFactory(),
    })

    expect(player.play('bomb')).toBe(false)
    expect(contexts.length).toBe(0)
  })

  it('returns false when createContext returns null', () => {
    const player = createSoundPlayer({
      storage: makeStorage(),
      createContext: () => null,
    })

    expect(player.play('bomb')).toBe(false)
  })

  it('uses default createContext with window.AudioContext or webkitAudioContext', () => {
    // When neither exists
    delete window.AudioContext
    delete window.webkitAudioContext
    const playerNoAudio = createSoundPlayer({ storage: makeStorage() })
    expect(playerNoAudio.play('bomb')).toBe(false)

    // With webkitAudioContext
    window.webkitAudioContext = FakeAudioContext
    const playerWebkit = createSoundPlayer({ storage: makeStorage() })
    expect(playerWebkit.play('bomb')).toBe(true)
    delete window.webkitAudioContext

    // With standard AudioContext
    window.AudioContext = FakeAudioContext
    const playerStandard = createSoundPlayer({ storage: makeStorage() })
    expect(playerStandard.play('bomb')).toBe(true)
  })

  it('handles missing or throwing storage gracefully', () => {
    // Missing storage
    const playerNoStorage = createSoundPlayer({
      storage: null,
      createContext: makeContextFactory(),
    })
    expect(playerNoStorage.isMuted()).toBe(false)
    expect(playerNoStorage.setMuted(true)).toBe(true)
    expect(playerNoStorage.isMuted()).toBe(true)

    // Storage where getItem throws
    const throwingGetStorage = {
      getItem: () => {
        throw new Error('Access denied')
      },
      setItem: () => {},
    }
    const playerGetThrow = createSoundPlayer({
      storage: throwingGetStorage,
      createContext: makeContextFactory(),
    })
    expect(playerGetThrow.isMuted()).toBe(false)

    // Storage where setItem throws
    const throwingSetStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('Quota exceeded')
      },
    }
    const playerSetThrow = createSoundPlayer({
      storage: throwingSetStorage,
      createContext: makeContextFactory(),
    })
    expect(playerSetThrow.setMuted(true)).toBe(true)
    expect(playerSetThrow.isMuted()).toBe(true)
  })

  it('exports singleton soundPlayer and playSound helper', () => {
    expect(soundPlayer).toBeDefined()
    expect(soundPlayerDefault).toBe(soundPlayer)

    const playSpy = vi.spyOn(soundPlayer, 'play').mockReturnValue(true)
    const result = playSound('rarity-legendary', { withCardFlip: true })

    expect(result).toBe(true)
    expect(playSpy).toHaveBeenCalledWith('rarity-legendary', { withCardFlip: true })
  })

  it('allows createSoundPlayer with default parameters and catches playback errors', () => {
    window.AudioContext = FakeAudioContext
    const player = createSoundPlayer()
    expect(player.isMuted()).toBe(false)
    expect(player.play('bomb')).toBe(true)

    const throwingPlayer = createSoundPlayer({
      storage: makeStorage(),
      createContext: () => {
        throw new Error('AudioContext blocked')
      },
    })
    expect(throwingPlayer.play('bomb')).toBe(false)
  })
})
