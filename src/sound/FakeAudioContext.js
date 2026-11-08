const makeParam = (value = 0) => ({
  value,
  events: [],
  setValueAtTime(v, t) {
    this.events.push(['set', v, t])
  },
  linearRampToValueAtTime(v, t) {
    this.events.push(['linear', v, t])
  },
  exponentialRampToValueAtTime(v, t) {
    if (v <= 0) throw new RangeError('exponential ramp target must be > 0')
    this.events.push(['exp', v, t])
  },
})

const makeNode = (extra = {}) => ({
  connections: [],
  connect(target) {
    this.connections.push(target)
  },
  ...extra,
})

// AudioContext minimal qui enregistre les sources démarrées, pour les tests.
export class FakeAudioContext {
  constructor() {
    this.currentTime = 0
    this.sampleRate = 8000
    this.destination = makeNode()
    this.started = []
    this.resumed = 0
  }

  resume() {
    this.resumed += 1
    return Promise.resolve()
  }

  createBuffer(channels, length) {
    const data = Array.from({ length: channels }, () => new Float32Array(length))
    return { getChannelData: (channel) => data[channel] }
  }

  createGain() {
    return makeNode({ gain: makeParam(1) })
  }

  createDynamicsCompressor() {
    return makeNode()
  }

  createConvolver() {
    return makeNode({ buffer: null })
  }

  createBiquadFilter() {
    return makeNode({ type: 'lowpass', frequency: makeParam(), Q: makeParam() })
  }

  createOscillator() {
    return this.#source({ type: 'sine', frequency: makeParam(), detune: makeParam() })
  }

  createBufferSource() {
    return this.#source({ buffer: null })
  }

  #source(extra) {
    const ctx = this
    return makeNode({
      ...extra,
      start(t) {
        ctx.started.push({ node: this, t })
      },
      stop(t) {
        this.stopAt = t
      },
    })
  }
}
