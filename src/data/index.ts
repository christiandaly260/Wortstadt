import type { District, Word } from '../types'
import buergerbuero from './districts/buergerbuero.json'
import maxvorstadt from './districts/maxvorstadt.json'
import viktualienmarkt from './districts/viktualienmarkt.json'
import englischerGarten from './districts/englischer-garten.json'
import werksviertel from './districts/werksviertel.json'
import theresienwiese from './districts/theresienwiese.json'
import garching from './districts/garching.json'
import ottobrunn from './districts/ottobrunn.json'

export const districts: District[] = [buergerbuero, maxvorstadt, viktualienmarkt, englischerGarten, werksviertel, theresienwiese, garching, ottobrunn].map((d) => d as District)

export interface MapNode {
  id: string
  name: string
  theme: string
  x: number
  y: number
  /** District id once the content exists; otherwise it's a construction site. */
  districtId?: string
  bonus?: boolean
}

/** Rough positions on a stylised Munich map (viewBox 0 0 400 460). */
const nodes: MapNode[] = [
  { id: 'buergerbuero', name: 'Bürgerbüro', theme: 'Anmeldung & Amtsdeutsch', x: 135, y: 340 },
  { id: 'maxvorstadt', name: 'Maxvorstadt', theme: 'Uni & Wissenschaft', x: 130, y: 150 },
  { id: 'viktualienmarkt', name: 'Viktualienmarkt', theme: 'Essen & Kochen', x: 205, y: 305 },
  { id: 'englischer-garten', name: 'Englischer Garten', theme: 'Sport & Natur', x: 215, y: 110 },
  { id: 'garching', name: 'Garching', theme: 'Technik & Forschung', x: 320, y: 50 },
  { id: 'werksviertel', name: 'Werksviertel', theme: 'Arbeit & Business', x: 335, y: 290 },
  { id: 'theresienwiese', name: 'Theresienwiese', theme: 'Redewendungen & Bairisch', x: 70, y: 255 },
  { id: 'ottobrunn', name: 'Ottobrunn', theme: 'Luft- & Raumfahrt', x: 335, y: 405, bonus: true },
]

/** Map nodes, linked to their district once its content exists. */
export const mapNodes: MapNode[] = nodes.map((n) => (districts.some((d) => d.id === n.id) ? { ...n, districtId: n.id } : n))

/** A district is open once every district it requires has at least one star. */
export function isUnlocked(d: District, stars: Record<string, number>): boolean {
  return (d.requires ?? []).every((r) => (stars[r] ?? 0) > 0)
}

export function districtName(id: string): string {
  return nodes.find((n) => n.id === id)?.name ?? id
}

export function getDistrict(id: string): District {
  const d = districts.find((x) => x.id === id)
  if (!d) throw new Error(`Unknown district ${id}`)
  return d
}

export function wordMap(d: District): Record<string, Word> {
  return Object.fromEntries(d.words.map((w) => [w.id, w]))
}

export function withArticle(w: Word): string {
  return w.article && !w.pluralOnly ? `${w.article} ${w.de}` : w.de
}
