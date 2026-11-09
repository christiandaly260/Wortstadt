import { describe, expect, it } from 'vitest'
import { checkAnswer } from './check'

describe('checkAnswer', () => {
  it('accepts exact answers', () => {
    expect(checkAnswer('Frist', ['Frist']).verdict).toBe('exact')
    expect(checkAnswer('  Frist. ', ['Frist']).ok).toBe(true)
  })

  it('accepts ae/oe/ue/ss for umlauts and ß', () => {
    expect(checkAnswer('gueltig', ['gültig']).verdict).toBe('exact')
    expect(checkAnswer('Staatsangehoerigkeit', ['Staatsangehörigkeit']).verdict).toBe('exact')
    expect(checkAnswer('Gebuehr', ['Gebühr']).ok).toBe(true)
  })

  it('accepts but flags a missing umlaut', () => {
    const r = checkAnswer('gultig', ['gültig'])
    expect(r.verdict).toBe('umlaut')
    expect(r.ok).toBe(true)
  })

  it('accepts but flags wrong capitalisation', () => {
    const r = checkAnswer('frist', ['Frist'])
    expect(r.verdict).toBe('case')
    expect(r.ok).toBe(true)
  })

  it('accepts a single typo on longer words only', () => {
    expect(checkAnswer('Vermiter', ['Vermieter']).verdict).toBe('typo')
    expect(checkAnswer('Fist', ['Frist']).verdict).toBe('wrong')
  })

  it('treats a wrong ending as a near miss', () => {
    const r = checkAnswer('eingezieht', ['eingezogen'])
    expect(r.near || r.verdict === 'wrong').toBe(true)
    expect(checkAnswer('unterschreibt', ['unterschreiben']).verdict).toBe('ending')
  })

  it('requires the right article when asked', () => {
    expect(checkAnswer('die Frist', ['Frist'], { article: 'die' }).verdict).toBe('exact')
    expect(checkAnswer('der Frist', ['Frist'], { article: 'die' }).verdict).toBe('article')
    expect(checkAnswer('Frist', ['Frist'], { article: 'die' }).verdict).toBe('article')
    expect(checkAnswer('der Frist', ['Frist'], { article: 'die' }).near).toBe(true)
  })

  it('ignores a typed article when none is asked for', () => {
    expect(checkAnswer('die Frist', ['Frist']).ok).toBe(true)
  })

  it('accepts colloquial answers with a note', () => {
    const r = checkAnswer('bekommen', ['erhalten'], { casual: ['bekommen'] })
    expect(r.verdict).toBe('casual')
    expect(r.ok).toBe(true)
  })

  it('treats the everyday word as a near miss in the register challenge', () => {
    const r = checkAnswer('bekommen', ['erhalten'], { nearMiss: { answers: ['bekommen'], note: 'x' } })
    expect(r.near).toBe(true)
  })

  it('rejects wrong answers', () => {
    expect(checkAnswer('Termin', ['Frist']).verdict).toBe('wrong')
    expect(checkAnswer('', ['Frist']).verdict).toBe('wrong')
  })

  it('accepts any of several answers', () => {
    expect(checkAnswer('Pass', ['Reisepass', 'Pass']).verdict).toBe('exact')
    expect(checkAnswer('auf Grund', ['Aufgrund', 'auf Grund']).verdict).toBe('exact')
  })
})
