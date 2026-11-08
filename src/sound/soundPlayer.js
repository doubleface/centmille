import { findSound } from './sounds.js'
import { createEngine, voice } from './synth.js'

export const MUTE_STORAGE_KEY = 'centmille-sound-muted'

const defaultCreateContext = () => {
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  return AudioCtx ? new AudioCtx() : null
}

const readMuted = (storage) => {
  try {
    return storage?.getItem(MUTE_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export const createSoundPlayer = ({
  storage = window.localStorage,
  createContext = defaultCreateContext,
} = {}) => {
  let engine = null
  let muted = readMuted(storage)

  const isMuted = () => muted

  const setMuted = (nextMuted) => {
    muted = Boolean(nextMuted)
    try {
      storage?.setItem(MUTE_STORAGE_KEY, String(muted))
    } catch {
      // Safe fallback if storage throws or is missing
    }
    return muted
  }

  const toggleMuted = () => setMuted(!muted)

  const play = (soundId, { withCardFlip = false } = {}) => {
    if (muted) return false

    const sound = findSound(soundId)
    if (!sound) return false

    try {
      if (!engine) {
        const ctx = createContext()
        if (!ctx) return false
        engine = createEngine(ctx, { volume: 0.8 })
      }

      engine.ctx.resume?.()

      if (withCardFlip) {
        findSound('card-flip')?.play(voice(engine))
      }

      sound.play(voice(engine))
      return true
    } catch {
      return false
    }
  }

  return {
    isMuted,
    setMuted,
    toggleMuted,
    play,
  }
}

export const soundPlayer = createSoundPlayer()

export const playSound = (soundId, options) => soundPlayer.play(soundId, options)

export default soundPlayer
