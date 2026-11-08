// Primitives de synthèse Web Audio : aucune ressource externe, fonctionne hors-ligne.

const SILENCE = 0.0001

export const midiToFreq = (midi) => 440 * 2 ** ((midi - 69) / 12)

const NOTE_OFFSETS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

// 'C5', 'F#3', 'Bb4' → fréquence en Hz
export const note = (name) => {
  const match = /^([A-G])([#b]?)(-?\d)$/.exec(name)
  if (!match) throw new Error(`Note invalide : ${name}`)
  const [, letter, accidental, octave] = match
  const shift = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0
  return midiToFreq(12 * (Number(octave) + 1) + NOTE_OFFSETS[letter] + shift)
}

const makeImpulse = (ctx, seconds, decay) => {
  const length = Math.floor(ctx.sampleRate * seconds)
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate)
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel)
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay
    }
  }
  return impulse
}

const makeNoiseBuffer = (ctx) => {
  const length = ctx.sampleRate * 2
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1
  return buffer
}

// Chaîne de sortie partagée : master → compresseur → haut-parleurs, avec une réverb en envoi.
export const createEngine = (ctx, { volume = 0.8 } = {}) => {
  const master = ctx.createGain()
  master.gain.value = volume
  const compressor = ctx.createDynamicsCompressor()
  master.connect(compressor)
  compressor.connect(ctx.destination)

  const verb = ctx.createConvolver()
  verb.buffer = makeImpulse(ctx, 2.4, 3)
  const verbReturn = ctx.createGain()
  verbReturn.gain.value = 0.35
  verb.connect(verbReturn)
  verbReturn.connect(master)

  return { ctx, master, verb, noiseBuffer: makeNoiseBuffer(ctx) }
}

// Chaque son reçoit une « voix » : le moteur + l'instant de départ.
export const voice = (engine) => ({ ...engine, t0: engine.ctx.currentTime + 0.03 })

const route = (v, node, wet) => {
  node.connect(v.master)
  if (wet > 0) {
    const send = v.ctx.createGain()
    send.gain.value = wet
    node.connect(send)
    send.connect(v.verb)
  }
}

const envelope = (param, t0, { gain, attack, dur }) => {
  param.setValueAtTime(SILENCE, t0)
  param.linearRampToValueAtTime(gain, t0 + attack)
  param.exponentialRampToValueAtTime(SILENCE, t0 + dur)
}

const applyFilter = (v, t0, dur, filter) => {
  const node = v.ctx.createBiquadFilter()
  node.type = filter.type ?? 'lowpass'
  node.frequency.setValueAtTime(filter.freq, t0)
  if (filter.endFreq) node.frequency.exponentialRampToValueAtTime(filter.endFreq, t0 + dur)
  node.Q.value = filter.q ?? 1
  return node
}

export const tone = (
  v,
  {
    freq,
    type = 'sine',
    at = 0,
    dur = 0.3,
    gain = 0.2,
    attack = 0.005,
    endFreq,
    glide,
    detune = 0,
    wet = 0,
    filter,
    vibrato,
    path,
  }
) => {
  const t0 = v.t0 + at
  const osc = v.ctx.createOscillator()
  osc.type = type
  osc.detune.value = detune
  osc.frequency.setValueAtTime(freq, t0)
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + (glide ?? dur))
  if (path) {
    for (const [time, value] of path) osc.frequency.linearRampToValueAtTime(value, t0 + time)
  }

  if (vibrato) {
    const lfo = v.ctx.createOscillator()
    const depth = v.ctx.createGain()
    lfo.frequency.value = vibrato.rate
    depth.gain.value = vibrato.depth
    lfo.connect(depth)
    depth.connect(osc.frequency)
    lfo.start(t0)
    lfo.stop(t0 + dur + 0.05)
  }

  const amp = v.ctx.createGain()
  envelope(amp.gain, t0, { gain, attack, dur })

  if (filter) {
    const filterNode = applyFilter(v, t0, dur, filter)
    osc.connect(filterNode)
    filterNode.connect(amp)
  } else {
    osc.connect(amp)
  }
  route(v, amp, wet)
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}

export const noise = (v, { at = 0, dur = 0.3, gain = 0.2, attack = 0.005, filter, wet = 0 }) => {
  const t0 = v.t0 + at
  const source = v.ctx.createBufferSource()
  source.buffer = v.noiseBuffer
  const amp = v.ctx.createGain()
  envelope(amp.gain, t0, { gain, attack, dur })
  if (filter) {
    const filterNode = applyFilter(v, t0, dur, filter)
    source.connect(filterNode)
    filterNode.connect(amp)
  } else {
    source.connect(amp)
  }
  route(v, amp, wet)
  source.start(t0)
  source.stop(t0 + dur + 0.05)
}

// Cloche : partiels inharmoniques, les aigus s'éteignent plus vite.
export const bell = (v, { freq, at = 0, dur = 1.6, gain = 0.15, wet = 0.4 }) => {
  const partials = [
    [1, 1, 1],
    [2.76, 0.5, 0.7],
    [5.4, 0.25, 0.45],
    [8.93, 0.12, 0.3],
  ]
  for (const [ratio, level, length] of partials) {
    tone(v, { freq: freq * ratio, at, dur: dur * length, gain: gain * level, wet })
  }
}

// Corde pincée façon harpe / guitare.
export const pluck = (v, { freq, at = 0, dur = 0.6, gain = 0.18, wet = 0.2 }) => {
  tone(v, { freq, type: 'triangle', at, dur, gain, wet })
  tone(v, { freq: freq * 2, at, dur: dur * 0.5, gain: gain * 0.3, wet })
}

// Cuivre : deux dents de scie désaccordées dans un passe-bas qui s'ouvre.
export const brass = (v, { freq, at = 0, dur = 0.4, gain = 0.12, wet = 0.25 }) => {
  for (const detune of [-7, 7]) {
    tone(v, {
      freq,
      type: 'sawtooth',
      at,
      dur,
      gain,
      attack: 0.03,
      detune,
      wet,
      filter: { type: 'lowpass', freq: freq * 6, endFreq: freq * 2, q: 1.5 },
    })
  }
}
