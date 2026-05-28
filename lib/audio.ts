'use client'

// Synthesized chess sounds via Web Audio API — zero file dependencies

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function gain(c: AudioContext, val: number, when = 0): GainNode {
  const g = c.createGain()
  g.gain.setValueAtTime(val, when)
  return g
}

function osc(c: AudioContext, type: OscillatorType, freq: number, start: number, end: number, vol = 0.3): void {
  const o = c.createOscillator()
  const g = gain(c, vol, c.currentTime)
  o.type = type
  o.frequency.setValueAtTime(freq, c.currentTime + start)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + end)
  o.connect(g)
  g.connect(c.destination)
  o.start(c.currentTime + start)
  o.stop(c.currentTime + end + 0.01)
}

function noise(c: AudioContext, duration: number, vol = 0.15): void {
  const size     = c.sampleRate * duration
  const buffer   = c.createBuffer(1, size, c.sampleRate)
  const data     = buffer.getChannelData(0)
  for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1)
  const src = c.createBufferSource()
  src.buffer = buffer
  const g = gain(c, vol, c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration)
  const filter = c.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 800
  src.connect(filter)
  filter.connect(g)
  g.connect(c.destination)
  src.start()
  src.stop(c.currentTime + duration)
}

// ── Public API ────────────────────────────────────────────────────────────────

let muted = false
export const chessAudio = {
  setMuted(m: boolean) { muted = m },

  move() {
    const c = getCtx(); if (!c || muted) return
    noise(c, 0.06, 0.12)
    osc(c, 'square', 880, 0, 0.04, 0.08)
  },

  capture() {
    const c = getCtx(); if (!c || muted) return
    noise(c, 0.12, 0.2)
    osc(c, 'sawtooth', 220, 0, 0.12, 0.12)
    osc(c, 'sawtooth', 165, 0.03, 0.14, 0.08)
  },

  check() {
    const c = getCtx(); if (!c || muted) return
    // Urgent three-pulse
    for (let i = 0; i < 3; i++) {
      osc(c, 'sine', 1760, i * 0.12, i * 0.12 + 0.08, 0.25)
    }
  },

  gameStart() {
    const c = getCtx(); if (!c || muted) return
    const freqs = [262, 330, 392, 523]
    freqs.forEach((f, i) => osc(c!, 'sine', f, i * 0.1, i * 0.1 + 0.18, 0.2))
  },

  gameWin() {
    const c = getCtx(); if (!c || muted) return
    const freqs = [392, 494, 587, 784]
    freqs.forEach((f, i) => osc(c!, 'triangle', f, i * 0.12, i * 0.12 + 0.3, 0.22))
  },

  gameLose() {
    const c = getCtx(); if (!c || muted) return
    const freqs = [392, 330, 262, 196]
    freqs.forEach((f, i) => osc(c!, 'sine', f, i * 0.18, i * 0.18 + 0.28, 0.18))
  },

  draw() {
    const c = getCtx(); if (!c || muted) return
    osc(c, 'sine', 440, 0, 0.4, 0.15)
    osc(c, 'sine', 440, 0.5, 0.9, 0.10)
  },

  castle() {
    const c = getCtx(); if (!c || muted) return
    noise(c, 0.08, 0.15)
    osc(c, 'square', 660, 0, 0.06, 0.1)
    osc(c, 'square', 880, 0.05, 0.1, 0.08)
  },

  promote() {
    const c = getCtx(); if (!c || muted) return
    const freqs = [523, 659, 784, 1047]
    freqs.forEach((f, i) => osc(c!, 'triangle', f, i * 0.07, i * 0.07 + 0.2, 0.18))
  },

  chatMessage() {
    const c = getCtx(); if (!c || muted) return
    osc(c, 'sine', 880, 0,    0.06, 0.12)
    osc(c, 'sine', 1100, 0.06, 0.14, 0.08)
  },
}
