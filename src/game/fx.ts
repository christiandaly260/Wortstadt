/** Tiny event bus for game-feel effects (XP pop-ups, level-ups, screen shake). */
export type FxEvent =
  | { type: 'xp'; amount: number; label?: string }
  | { type: 'levelup'; rank: string; level: number }
  | { type: 'shake' }

const listeners = new Set<(e: FxEvent) => void>()

export function emitFx(e: FxEvent) {
  listeners.forEach((l) => l(e))
}

export function onFx(l: (e: FxEvent) => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
