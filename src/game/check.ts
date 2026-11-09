/**
 * Forgiving-but-honest answer checking.
 *
 * ok    → counts as correct (maybe with a note, e.g. a typo)
 * near  → "Fast!" — the player gets one retry without losing patience
 * wrong → counts as a mistake
 */
export type Verdict = 'exact' | 'case' | 'umlaut' | 'typo' | 'casual' | 'article' | 'register' | 'ending' | 'wrong'

export interface CheckResult {
  verdict: Verdict
  ok: boolean
  near: boolean
  note?: string
  expected: string
}

export interface CheckOptions {
  /** Expected article for nouns; if set, the answer must include it. */
  article?: string
  /** Answers that are accepted but flagged as too colloquial. */
  casual?: string[]
  /** Answers that are understandable but not what's wanted → near miss. */
  nearMiss?: { answers: string[]; note: string }
}

const ARTICLES = ['der', 'die', 'das']

function clean(s: string): string {
  return s
    .normalize('NFC')
    .replace(/[„“"'.!?,;:]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Lower-case and spell umlauts/ß out, so "gueltig" == "gültig". */
export function fold(s: string): string {
  return clean(s)
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
}

/** Lower-case and drop umlaut dots entirely, so "gultig" == "gültig". */
function strip(s: string): string {
  return clean(s)
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss')
}

export function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j]
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return dp[b.length]
}

function commonPrefix(a: string, b: string): number {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return i
}

const RANK: Verdict[] = ['exact', 'case', 'umlaut', 'typo', 'casual', 'article', 'register', 'ending', 'wrong']

function compareWord(input: string, answer: string): { verdict: Verdict; note?: string } {
  if (clean(input) === clean(answer)) return { verdict: 'exact' }
  if (fold(input) === fold(answer)) {
    // Same letters (ae/oe/ue/ss count as ä/ö/ü/ß); only the capitalisation can differ.
    const i = clean(input)
    const wantCap = /[A-ZÄÖÜ]/.test(answer[0])
    const hasCap = /[A-ZÄÖÜ]/.test(i[0])
    if (wantCap !== hasCap) return { verdict: 'case', note: `Groß-/Kleinschreibung: ${answer}` }
    return { verdict: 'exact' }
  }
  if (strip(input) === strip(answer)) return { verdict: 'umlaut', note: `Umlaut nicht vergessen: ${answer}` }

  const a = fold(input)
  const b = fold(answer)
  const dist = levenshtein(a, b)
  // Grammar lives in the endings, so a slip there is a near miss rather than a free pass.
  const prefix = commonPrefix(a, b)
  if (prefix >= Math.max(4, b.length - 3) && Math.abs(a.length - b.length) <= 3) {
    return { verdict: 'ending', note: 'Fast – der Wortstamm stimmt, aber die Endung nicht.' }
  }
  if (b.length >= 6 && dist === 1) return { verdict: 'typo', note: `Kleiner Tippfehler – richtig: ${answer}` }
  if (b.length >= 12 && dist === 2) return { verdict: 'typo', note: `Kleiner Tippfehler – richtig: ${answer}` }
  return { verdict: 'wrong' }
}

function best(results: { verdict: Verdict; note?: string }[]) {
  return results.sort((x, y) => RANK.indexOf(x.verdict) - RANK.indexOf(y.verdict))[0]
}

export function checkAnswer(input: string, answers: string[], opts: CheckOptions = {}): CheckResult {
  const expected = opts.article ? `${opts.article} ${answers[0]}` : answers[0]
  const raw = clean(input)
  const finish = (r: { verdict: Verdict; note?: string }): CheckResult => ({
    ...r,
    expected,
    ok: ['exact', 'case', 'umlaut', 'typo', 'casual'].includes(r.verdict),
    near: ['article', 'register', 'ending'].includes(r.verdict),
  })

  if (!raw) return finish({ verdict: 'wrong' })

  // Split off an article if the player typed one.
  let typedArticle: string | undefined
  let body = raw
  const first = raw.split(' ')[0].toLowerCase()
  if (ARTICLES.includes(first) && raw.includes(' ')) {
    typedArticle = first
    body = raw.slice(first.length + 1)
  }

  const main = best(answers.map((a) => compareWord(body, a)))

  if (main.verdict !== 'wrong' && main.verdict !== 'ending') {
    if (opts.article) {
      if (!typedArticle) return finish({ verdict: 'article', note: `Mit Artikel, bitte: ${expected}` })
      if (typedArticle !== opts.article) return finish({ verdict: 'article', note: `Falscher Artikel – es heißt ${expected}` })
    }
    return finish(main)
  }

  // If the player typed an article that wasn't asked for, try the whole input too.
  if (typedArticle && !opts.article) {
    const whole = best(answers.map((a) => compareWord(raw, a)))
    if (whole.verdict !== 'wrong') return finish(whole)
  }

  if (opts.casual) {
    const c = best(opts.casual.map((a) => compareWord(body, a)))
    if (['exact', 'case', 'umlaut', 'typo'].includes(c.verdict)) {
      return finish({ verdict: 'casual', note: `Geht, aber etwas umgangssprachlich. Im Amt sagt man: ${answers[0]}` })
    }
  }

  if (opts.nearMiss) {
    const n = best(opts.nearMiss.answers.map((a) => compareWord(body, a)))
    if (['exact', 'case', 'umlaut', 'typo'].includes(n.verdict)) {
      return finish({ verdict: 'register', note: opts.nearMiss.note })
    }
  }

  return finish(main)
}
