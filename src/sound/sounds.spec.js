import { describe, expect, it } from 'vitest'
import { FakeAudioContext } from './FakeAudioContext.js'
import { findSound, SOUND_CATEGORIES, SOUNDS } from './sounds.js'
import { createEngine, midiToFreq, noise, note, tone, voice } from './synth.js'

describe('note', () => {
  it('converts note names to frequencies', () => {
    expect(note('A4')).toBe(440)
    expect(note('C4')).toBeCloseTo(261.63, 1)
    expect(note('F#3')).toBeCloseTo(185, 0)
    expect(note('Bb4')).toBeCloseTo(466.16, 1)
    expect(midiToFreq(81)).toBe(880)
  })

  it('rejects invalid names', () => {
    expect(() => note('H2')).toThrow('Note invalide')
  })
})

describe('synth engine', () => {
  it('routes the master through a compressor to the destination', () => {
    const ctx = new FakeAudioContext()
    const engine = createEngine(ctx, { volume: 0.5 })
    expect(engine.master.gain.value).toBe(0.5)
    expect(engine.master.connections[0].connections).toContain(ctx.destination)
    expect(engine.verb.buffer).not.toBe(null)
  })

  it('schedules tones relative to the voice start time', () => {
    const ctx = new FakeAudioContext()
    ctx.currentTime = 10
    const v = voice(createEngine(ctx))
    tone(v, { freq: 440, at: 1, dur: 0.5, path: [[0.2, 500]] })
    const [{ node, t }] = ctx.started
    expect(t).toBeCloseTo(11.03)
    expect(node.stopAt).toBeCloseTo(11.58)
    expect(node.frequency.events).toContainEqual(['linear', 500, expect.closeTo(11.23)])
    noise(v, { dur: 0.1 })
    expect(ctx.started.length).toBe(2)
  })
})

describe('sound catalog', () => {
  it('has unique ids and known categories', () => {
    const ids = SOUNDS.map((sound) => sound.id)
    const categories = SOUND_CATEGORIES.map((category) => category.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const sound of SOUNDS) expect(categories).toContain(sound.category)
  })

  it.each(
    SOUNDS.map((sound) => [sound.id, sound])
  )('%s schedules audio without errors', (_, sound) => {
    const ctx = new FakeAudioContext()
    sound.play(voice(createEngine(ctx)))
    expect(ctx.started.length).toBeGreaterThan(0)
  })

  it('finds sounds by id', () => {
    expect(findSound('bomb').label).toContain('Bombe')
    expect(findSound('nope')).toBe(null)
  })
})
