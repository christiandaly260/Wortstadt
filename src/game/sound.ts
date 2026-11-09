import { getState } from './progress'

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (getState().muted) return null
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', vol = 0.15) {
  const c = audio()
  if (!c) return
  const t = c.currentTime + start
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(gain).connect(c.destination)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

/** Correct answer; pitch climbs with the combo. */
export function playRight(combo = 1) {
  const base = 523 * Math.pow(2, Math.min(combo - 1, 8) / 12)
  tone(base, 0, 0.12, 'triangle')
  tone(base * 1.5, 0.08, 0.18, 'triangle')
}

export function playNear() {
  tone(440, 0, 0.12, 'triangle', 0.1)
}

export function playWrong() {
  tone(180, 0, 0.25, 'sawtooth', 0.08)
  tone(140, 0.1, 0.3, 'sawtooth', 0.08)
}

export function playFanfare() {
  ;[523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, 'triangle', 0.12))
}

export function playTap() {
  tone(880, 0, 0.05, 'square', 0.04)
}
