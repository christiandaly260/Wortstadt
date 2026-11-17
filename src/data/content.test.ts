import { describe, expect, it } from 'vitest'
import { districts, mapNodes } from './index'
import { clozeOf } from '../components/encounters/Lueckentext'
import { checkAnswer } from '../game/check'

/** Can `target` be built by concatenating distinct tiles? */
function buildable(target: string, tiles: string[]): boolean {
  const t = target.toLowerCase()
  const go = (rest: string, used: Set<number>): boolean => {
    if (!rest) return true
    return tiles.some((tile, i) => !used.has(i) && rest.startsWith(tile.toLowerCase()) && go(rest.slice(tile.length), new Set([...used, i])))
  }
  return go(t, new Set())
}

describe.each(districts.map((d) => [d.id, d] as const))('district %s', (_, d) => {
  const ids = new Set(d.words.map((w) => w.id))

  it('has unique word ids and complete words', () => {
    expect(ids.size).toBe(d.words.length)
    for (const w of d.words) {
      expect(w.de, w.id).toBeTruthy()
      expect(w.en, w.id).toBeTruthy()
      if (w.pos === 'noun') expect(w.article, `${w.id} needs an article`).toMatch(/^(der|die|das)$/)
      else expect(w.article, `${w.id} is not a noun`).toBeUndefined()
      // The word (or its inflected cloze form) must appear in its example sentence.
      expect(w.example.includes(w.cloze ?? w.de), `${w.id}: example must contain "${w.cloze ?? w.de}"`).toBe(true)
      expect(clozeOf(w).text).toContain('___')
    }
  })

  it('uses every word in exactly one station', () => {
    const used = d.stations.flatMap((s) => s.words)
    expect(new Set(used).size, 'a word is in two stations').toBe(used.length)
    for (const id of used) expect(ids.has(id), `unknown word ${id}`).toBe(true)
    expect(used.length).toBe(d.words.length)
  })

  it('has a map node and valid unlock requirements', () => {
    expect(mapNodes.some((n) => n.districtId === d.id)).toBe(true)
    for (const r of d.requires ?? []) expect(districts.some((x) => x.id === r), `requires unknown ${r}`).toBe(true)
  })

  for (const st of d.stations) {
    describe(`station ${st.id}`, () => {
      it('scene highlights only known words, and each station word appears in its scene', () => {
        const marked = [...st.scene.map((l) => l.text).join(' ').matchAll(/\{([\w-]+)\|[^}]+\}/g)].map((m) => m[1])
        for (const id of marked) expect(ids.has(id), `scene marks unknown ${id}`).toBe(true)
        for (const id of st.words) expect(marked.includes(id), `${id} is not highlighted in the scene`).toBe(true)
        for (const l of st.scene) expect(l.text).not.toMatch(/\{[^|}]*\}/)
      })

      it('has valid encounters', () => {
        expect(st.encounters.length).toBeGreaterThanOrEqual(3)
        for (const e of st.encounters) {
          if (e.type === 'artikel' || e.type === 'lueckentext') {
            for (const id of e.words) expect(ids.has(id), `${e.type} uses unknown ${id}`).toBe(true)
            if (e.type === 'artikel')
              for (const id of e.words) {
                const w = d.words.find((x) => x.id === id)!
                expect(w.article && !w.pluralOnly, `${id} can't be in Artikel-Regen`).toBeTruthy()
              }
          }
          if (e.type === 'kollokation')
            for (const it of e.items) {
              expect(it.options, it.phrase).toContain(it.answer)
              expect(new Set(it.options).size).toBe(it.options.length)
              expect(it.phrase).toContain('___')
            }
          if (e.type === 'gespraech')
            for (const it of e.items) expect(it.options.filter((o) => o.ok).length, it.npc).toBe(1)
          if (e.type === 'schmiede')
            for (const it of e.items) expect(buildable(it.target, it.tiles), `can't forge ${it.target}`).toBe(true)
        }
      })
    })
  }

  it('has a valid boss', () => {
    expect(d.boss.items.length).toBeGreaterThanOrEqual(8)
    for (const it of d.boss.items) {
      expect(`${it.npc} ${it.you}`.split('___').length - 1, it.npc).toBe(1)
      if (it.wordId) expect(ids.has(it.wordId), `boss uses unknown ${it.wordId}`).toBe(true)
      expect(checkAnswer(it.answers[0], it.answers).ok).toBe(true)
    }
  })

  it('has a valid register challenge', () => {
    expect(d.challenge.items.length).toBeGreaterThanOrEqual(8)
    for (const it of d.challenge.items) {
      expect(it.sentence.split('___').length - 1, it.sentence).toBe(1)
      // The everyday word must not itself be accepted as the answer.
      expect(checkAnswer(it.casual, it.answers).ok, `${it.casual} would pass`).toBe(false)
    }
  })
})
