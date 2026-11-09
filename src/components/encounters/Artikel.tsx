import { useEffect, useRef, useState } from 'react'
import type { Article, Result, Word } from '../../types'
import { shuffle } from '../ui'

const ARTICLES: Article[] = ['der', 'die', 'das']

/** Words fall from the top; sort them into der / die / das before they land. */
export function Artikel({ words, onResult, onDone }: { words: Word[]; onResult: (r: Result) => void; onDone: () => void }) {
  const [queue] = useState(() => shuffle(words.filter((w) => w.article && !w.pluralOnly)))
  const [i, setI] = useState(0)
  const [flash, setFlash] = useState<{ ok: boolean; picked?: Article } | null>(null)
  const [started, setStarted] = useState(false)
  const word = queue[i]
  // Each word falls a bit faster than the last.
  const duration = Math.max(2.8, 5.5 - i * 0.4)

  const doneRef = useRef(false)
  const answer = (picked?: Article) => {
    if (flash || !word || doneRef.current) return
    const ok = picked === word.article
    setFlash({ ok, picked })
    onResult({ wordId: word.id, correct: ok })
    setTimeout(
      () => {
        setFlash(null)
        if (i + 1 >= queue.length) {
          doneRef.current = true
          onDone()
        } else setI(i + 1)
      },
      ok ? 550 : 1300,
    )
  }

  useEffect(() => {
    if (!started) return
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Article> = { '1': 'der', '2': 'die', '3': 'das', ArrowLeft: 'der', ArrowDown: 'die', ArrowRight: 'das' }
      if (map[e.key]) {
        e.preventDefault()
        answer(map[e.key])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    if (queue.length === 0) onDone()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  if (queue.length === 0) return null

  if (!started) {
    return (
      <div className="enc-intro">
        <h3>Artikel-Regen</h3>
        <p>Die Wörter fallen – sortiere sie, bevor sie unten ankommen. Jedes Wort ist ein bisschen schneller.</p>
        <p className="muted">Tastatur: 1 / 2 / 3 oder ← ↓ →</p>
        <button className="btn big" onClick={() => setStarted(true)} autoFocus>
          Los!
        </button>
      </div>
    )
  }

  return (
    <div className="artikel">
      <div className="artikel-sky">
        {word && (
          <div
            key={word.id}
            className={`falling ${flash ? (flash.ok ? 'hit' : 'miss') : ''}`}
            style={{ animationDuration: `${duration}s`, animationPlayState: flash ? 'paused' : 'running' }}
            onAnimationEnd={() => answer(undefined)}
          >
            {flash && <span className={`a-${word.article}`}>{word.article} </span>}
            {word.de}
          </div>
        )}
        <div className="artikel-count">
          {i + 1}/{queue.length}
        </div>
      </div>
      <div className="artikel-buttons">
        {ARTICLES.map((a) => (
          <button
            key={a}
            className={`abtn a-${a}-bg ${flash?.picked === a ? (flash.ok ? 'picked-ok' : 'picked-bad') : ''}`}
            onClick={() => answer(a)}
          >
            {a}
          </button>
        ))}
      </div>
    </div>
  )
}
