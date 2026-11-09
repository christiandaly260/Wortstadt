import type { District, Word } from '../types'
import buergerbuero from './districts/buergerbuero.json'

export const districts: District[] = [buergerbuero as District]

export interface MapNode {
  id: string
  name: string
  theme: string
  x: number
  y: number
  /** District id once the content exists; otherwise it's a construction site. */
  districtId?: string
}

/** Rough positions on a stylised Munich map (viewBox 0 0 400 460). */
export const mapNodes: MapNode[] = [
  { id: 'buergerbuero', name: 'Bürgerbüro', theme: 'Anmeldung & Amtsdeutsch', x: 135, y: 340, districtId: 'buergerbuero' },
  { id: 'maxvorstadt', name: 'Maxvorstadt', theme: 'Uni & Wissenschaft', x: 130, y: 150 },
  { id: 'viktualienmarkt', name: 'Viktualienmarkt', theme: 'Essen & Kochen', x: 205, y: 305 },
  { id: 'englischer-garten', name: 'Englischer Garten', theme: 'Sport & Natur', x: 215, y: 110 },
  { id: 'garching', name: 'Garching', theme: 'Luft- & Raumfahrt', x: 320, y: 50 },
  { id: 'werksviertel', name: 'Werksviertel', theme: 'Arbeit & Business', x: 335, y: 300 },
  { id: 'theresienwiese', name: 'Theresienwiese', theme: 'Redewendungen & Bairisch', x: 70, y: 255 },
]

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
