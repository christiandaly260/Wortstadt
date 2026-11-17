import { useSyncExternalStore } from 'react'
import type { District } from '../types'
import { emitFx } from './fx'

/**
 * Spaced repetition with Leitner boxes. Box 0 = never answered correctly.
 * Each correct answer moves a word up a box; a mistake sends it back to box 1, due now.
 */
const DAY = 24 * 60 * 60 * 1000
export const INTERVALS_DAYS = [0, 1, 3, 7, 16, 40]
export const MAX_BOX = INTERVALS_DAYS.length - 1

export interface WordProgress {
  box: number
  due: number
  right: number
  wrong: number
}

export interface State {
  version: 1
  words: Record<string, WordProgress>
  seen: Record<string, true>
  stations: Record<string, true>
  stars: Record<string, number>
  missed: Record<string, string[]>
  muted: boolean
  xp: number
  streak: { count: number; lastDay: string }
}

const KEY = 'wortstadt:v1'

export const XP = {
  answer: 10,
  /** Extra XP per step of combo, capped. */
  comboStep: 2,
  comboCap: 10,
  station: 60,
  boss: 150,
  bossPerfect: 100,
  challenge: 200,
}

/** Commuter ranks: the XP needed to reach each one. */
export const RANKS = [
  { name: 'Tourist', xp: 0 },
  { name: 'Neuankömmling', xp: 200 },
  { name: 'Pendler', xp: 600 },
  { name: 'Stammgast', xp: 1400 },
  { name: 'Kiez-Kenner', xp: 2800 },
  { name: 'Münchner', xp: 5000 },
  { name: 'Ur-Münchner', xp: 8500 },
  { name: 'Stadtlegende', xp: 14000 },
]

export function rankInfo(xp: number) {
  let i = 0
  while (i + 1 < RANKS.length && xp >= RANKS[i + 1].xp) i++
  const cur = RANKS[i]
  const next = RANKS[i + 1]
  return {
    level: i + 1,
    name: cur.name,
    next: next?.name,
    /** 0..1 progress towards the next rank (1 at max rank). */
    progress: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1,
    toNext: next ? next.xp - xp : 0,
  }
}

export function answerXp(combo: number): number {
  return XP.answer + Math.min(combo, XP.comboCap) * XP.comboStep
}

function dayKey(t = new Date()): string {
  return `${t.getFullYear()}-${t.getMonth() + 1}-${t.getDate()}`
}

/** Days in a row with at least one answer; 0 if the chain is broken. */
export function currentStreak(s: State = state): number {
  const today = dayKey()
  const y = new Date()
  y.setDate(y.getDate() - 1)
  return s.streak.lastDay === today || s.streak.lastDay === dayKey(y) ? s.streak.count : 0
}

export function addXp(amount: number, label?: string) {
  if (amount <= 0) return
  const before = rankInfo(state.xp)
  set({ ...state, xp: state.xp + amount })
  emitFx({ type: 'xp', amount, label })
  const after = rankInfo(state.xp)
  if (after.level > before.level) emitFx({ type: 'levelup', rank: after.name, level: after.level })
}

const empty = (): State => ({
  version: 1,
  words: {},
  seen: {},
  stations: {},
  stars: {},
  missed: {},
  muted: false,
  xp: 0,
  streak: { count: 0, lastDay: '' },
})

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const saved = JSON.parse(raw) as Partial<State>
      const s = { ...empty(), ...saved }
      // Saves from before XP existed: credit what was already played.
      if (saved.xp === undefined) {
        const right = Object.values(s.words).reduce((a, w) => a + w.right, 0)
        const stars = Object.values(s.stars).reduce((a, b) => a + b, 0)
        s.xp = right * 12 + Object.keys(s.stations).length * XP.station + stars * 100
      }
      return s
    }
  } catch {
    /* storage unavailable or corrupt → start fresh */
  }
  return empty()
}

let state: State = load()
const listeners = new Set<() => void>()

function set(next: State) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* ignore quota / private mode */
  }
  listeners.forEach((l) => l())
}

export function useProgress(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

export function getState(): State {
  return state
}

export function recordAnswer(wordId: string | undefined, correct: boolean, districtId?: string) {
  if (!wordId) return
  const now = Date.now()
  const prev = state.words[wordId] ?? { box: 0, due: now, right: 0, wrong: 0 }
  const box = correct ? Math.min(MAX_BOX, prev.box + 1) : 1
  const next: WordProgress = {
    box,
    due: correct ? now + INTERVALS_DAYS[box] * DAY : now,
    right: prev.right + (correct ? 1 : 0),
    wrong: prev.wrong + (correct ? 0 : 1),
  }
  let missed = state.missed
  if (districtId) {
    const list = new Set(missed[districtId] ?? [])
    if (correct) list.delete(wordId)
    else list.add(wordId)
    missed = { ...missed, [districtId]: [...list] }
  }
  const today = dayKey()
  let streak = state.streak
  if (streak.lastDay !== today) streak = { count: currentStreak() + 1, lastDay: today }
  set({ ...state, words: { ...state.words, [wordId]: next }, missed, streak })
}

export function markSeen(ids: string[]) {
  const seen = { ...state.seen }
  ids.forEach((id) => (seen[id] = true))
  set({ ...state, seen })
}

export function clearStation(id: string) {
  set({ ...state, stations: { ...state.stations, [id]: true } })
}

export function awardStars(districtId: string, stars: number) {
  const current = state.stars[districtId] ?? 0
  if (stars > current) set({ ...state, stars: { ...state.stars, [districtId]: stars } })
}

export function toggleMute() {
  set({ ...state, muted: !state.muted })
}

export function resetProgress() {
  set(empty())
}

/** Words of a district that were learned once and are now due for review. */
export function dueWords(d: District, s: State = state, now = Date.now()): string[] {
  return d.words
    .filter((w) => {
      const p = s.words[w.id]
      return p && p.box >= 1 && p.due <= now
    })
    .sort((a, b) => s.words[a.id].due - s.words[b.id].due)
    .map((w) => w.id)
}

/** 0..1 — how foggy a district is: the share of its learned words that are overdue. */
export function fog(d: District, s: State = state, now = Date.now()): number {
  const learned = d.words.filter((w) => (s.words[w.id]?.box ?? 0) >= 1)
  if (learned.length === 0) return 0
  return dueWords(d, s, now).length / learned.length
}

export function learnedCount(s: State): number {
  return Object.values(s.words).filter((w) => w.box >= 2).length
}
