import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Character, Word } from '../types'
import { checkAnswer, type CheckOptions, type CheckResult } from '../game/check'
import { withArticle } from '../data'

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Calls `fn` when Enter is pressed (and `active` is true). */
export function useEnter(fn: () => void, active = true) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.repeat) {
        e.preventDefault()
        ref.current()
      }
    }
    // Defer so the Enter that triggered this state doesn't also fire it.
    const t = setTimeout(() => window.addEventListener('keydown', onKey), 50)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
    }
  }, [active])
}

/** Renders text with {wordId|surface} markup as tappable highlights. */
export function Highlighted({ text, onWord }: { text: string; onWord?: (id: string) => void }) {
  const parts: ReactNode[] = []
  const re = /\{([\w-]+)\|([^}]+)\}/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const id = m[1]
    parts.push(
      <button key={m.index} className="hl" onClick={() => onWord?.(id)}>
        {m[2]}
      </button>,
    )
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts}</>
}

/** Sentence with a ___ gap rendered as a slot. */
export function Gap({ text, fill, state }: { text: string; fill?: string; state?: 'ok' | 'bad' }) {
  const [a, b] = text.split('___')
  if (b === undefined) return <>{text}</>
  return (
    <>
      {a}
      <span className={`gap ${state ?? ''}`}>{fill || '      '}</span>
      {b}
    </>
  )
}

export function Patience({ character, left }: { character: Character; left: number }) {
  return (
    <div className="patience" title={`Geduld von ${character.name}`}>
      <span className="patience-emoji">{character.emoji}</span>
      <span className="patience-hearts">
        {Array.from({ length: character.patience }, (_, i) => (
          <span key={i} className={i < left ? 'heart' : 'heart gone'}>
            ●
          </span>
        ))}
      </span>
    </div>
  )
}

export function WordCard({ word, onClose }: { word: Word; onClose: () => void }) {
  useEnter(onClose)
  return (
    <div className="overlay" onClick={onClose}>
      <div className="wordcard" onClick={(e) => e.stopPropagation()}>
        {word.article && !word.pluralOnly && <div className={`article-tag a-${word.article}`}>{word.article}</div>}
        <h2>{word.de}</h2>
        <div className="wc-meta">
          {word.pluralOnly ? 'nur Plural' : word.plural ? `Pl. ${word.plural}` : word.pos}
        </div>
        <p className="wc-en">{word.en}</p>
        <p className="wc-ex">„{word.example}“</p>
        <button className="btn" onClick={onClose}>
          Alles klar
        </button>
      </div>
    </div>
  )
}

const UMLAUTS = ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü']

export function TypeInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  disabled?: boolean
  placeholder?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!disabled) ref.current?.focus()
  }, [disabled])

  const insert = (ch: string) => {
    const el = ref.current
    if (!el) return
    const s = el.selectionStart ?? value.length
    const e = el.selectionEnd ?? value.length
    onChange(value.slice(0, s) + ch + value.slice(e))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(s + 1, s + 1)
    })
  }

  return (
    <form
      className="type-input"
      onSubmit={(e) => {
        e.preventDefault()
        if (!disabled && value.trim()) onSubmit()
      }}
    >
      <div className="type-row">
        <input
          ref={ref}
          value={value}
          disabled={disabled}
          placeholder={placeholder ?? 'Antwort tippen …'}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          lang="de"
        />
        <button className="btn" type="submit" disabled={disabled || !value.trim()}>
          ↵
        </button>
      </div>
      <div className="umlauts">
        {UMLAUTS.map((u) => (
          <button key={u} type="button" tabIndex={-1} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => insert(u)}>
            {u}
          </button>
        ))}
      </div>
    </form>
  )
}

export function Feedback({ result, word, extra, onNext }: { result: CheckResult; word?: Word; extra?: string; onNext: () => void }) {
  useEnter(onNext)
  const cls = result.ok ? 'fb ok' : 'fb bad'
  return (
    <div className={cls}>
      <div className="fb-title">{result.ok ? (result.verdict === 'exact' ? 'Richtig!' : 'Gilt!') : 'Leider falsch.'}</div>
      {!result.ok && (
        <div className="fb-expected">
          Richtig wäre: <strong>{result.expected}</strong>
        </div>
      )}
      {result.note && result.ok && <div className="fb-note">{result.note}</div>}
      {extra && <div className="fb-note">{extra}</div>}
      {word && (
        <div className="fb-word">
          <strong>{withArticle(word)}</strong> – {word.en}
          <div className="fb-ex">„{word.example}“</div>
        </div>
      )}
      <button className="btn" onClick={onNext} autoFocus>
        Weiter ↵
      </button>
    </div>
  )
}

/**
 * One typed question: check, allow one retry on a near miss, then show feedback.
 * `onJudged` fires once with the final verdict; `onNext` when the player moves on.
 */
export function TypedQuestion({
  prompt,
  answers,
  options,
  word,
  seconds,
  onJudged,
  onNext,
}: {
  prompt: (fill: string | undefined, state: 'ok' | 'bad' | undefined) => ReactNode
  answers: string[]
  options?: CheckOptions
  word?: Word
  seconds?: number
  onJudged: (ok: boolean) => void
  onNext: () => void
}) {
  const [value, setValue] = useState('')
  const [near, setNear] = useState<CheckResult | null>(null)
  const [final, setFinal] = useState<CheckResult | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  const judge = (r: CheckResult) => {
    setFinal(r)
    onJudged(r.ok)
  }

  const submit = () => {
    const r = checkAnswer(value, answers, options)
    if (r.near && !near) {
      setNear(r)
      return
    }
    judge(r.near ? { ...r, ok: false } : r)
  }

  // Timer (boss fights).
  const [left, setLeft] = useState(seconds ?? 0)
  useEffect(() => {
    if (!seconds || final) return
    if (left <= 0) {
      setTimedOut(true)
      judge(checkAnswer('', answers, options))
      return
    }
    const t = setTimeout(() => setLeft((x) => x - 0.1), 100)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, seconds, final])

  return (
    <div className="typed">
      {seconds ? (
        <div className="timer">
          <div className="timer-fill" style={{ width: `${Math.max(0, (left / seconds) * 100)}%` }} data-low={left < seconds * 0.3} />
        </div>
      ) : null}
      <div className="prompt">{prompt(final ? (final.ok ? value : final.expected.replace(/^(der|die|das) /, '')) : undefined, final ? (final.ok ? 'ok' : 'bad') : undefined)}</div>
      {!final && (
        <>
          <TypeInput value={value} onChange={setValue} onSubmit={submit} />
          {near && <div className="fb near">Fast! {near.note} Noch ein Versuch.</div>}
        </>
      )}
      {final && <Feedback result={final} word={word} extra={timedOut ? 'Zu langsam!' : undefined} onNext={onNext} />}
    </div>
  )
}

export function Dots({ total, current }: { total: number; current: number }) {
  return (
    <div className="dots">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < current ? 'dot done' : i === current ? 'dot now' : 'dot'} />
      ))}
    </div>
  )
}

/** Number that counts up from 0 — for scores on result screens. */
export function CountUp({ to, ms = 900 }: { to: number; ms?: number }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setV(to)
      return
    }
    const start = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / ms)
      setV(Math.round(to * (1 - Math.pow(1 - k, 3))))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, ms])
  return <>{v}</>
}
