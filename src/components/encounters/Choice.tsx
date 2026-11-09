import { useEffect, useMemo, useState } from 'react'
import type { GespraechItem, KollokationItem, Result } from '../../types'
import { Gap, shuffle, useEnter } from '../ui'

function useNumberKeys(n: number, pick: (i: number) => void, active: boolean) {
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      const k = Number(e.key)
      if (k >= 1 && k <= n) pick(k - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
}

function Next({ onNext, children }: { onNext: () => void; children?: React.ReactNode }) {
  useEnter(onNext)
  return (
    <div className="choice-next">
      {children}
      <button className="btn" onClick={onNext}>
        Weiter ↵
      </button>
    </div>
  )
}

/** Pick the verb (or particle) that belongs with the noun. */
export function Kollokation({ items, onResult, onDone }: { items: KollokationItem[]; onResult: (r: Result) => void; onDone: () => void }) {
  const [queue] = useState(() => shuffle(items))
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const item = queue[i]
  const options = useMemo(() => shuffle(item.options), [item])

  const pick = (idx: number) => {
    if (picked) return
    const o = options[idx]
    setPicked(o)
    onResult({ correct: o === item.answer })
  }
  useNumberKeys(options.length, pick, !picked)

  const next = () => {
    setPicked(null)
    if (i + 1 >= queue.length) onDone()
    else setI(i + 1)
  }

  return (
    <div className="enc">
      <h3 className="enc-title">Was passt zusammen?</h3>
      <p className="sentence big">
        <Gap text={item.phrase} fill={picked ? item.answer : undefined} state={picked ? (picked === item.answer ? 'ok' : 'bad') : undefined} />
      </p>
      <p className="hint">{item.en}</p>
      <div className="choices">
        {options.map((o, idx) => (
          <button
            key={o}
            className={`choice ${picked ? (o === item.answer ? 'right' : o === picked ? 'wrong' : 'dim') : ''}`}
            onClick={() => pick(idx)}
          >
            <span className="key">{idx + 1}</span>
            {o}
          </button>
        ))}
      </div>
      {picked && <Next onNext={next} />}
    </div>
  )
}

/** Choose the reply that says the right thing in the right register. */
export function Gespraech({
  items,
  npcEmoji,
  onResult,
  onDone,
}: {
  items: GespraechItem[]
  npcEmoji: string
  onResult: (r: Result) => void
  onDone: () => void
}) {
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const item = items[i]
  const options = useMemo(() => shuffle(item.options), [item])

  const pick = (idx: number) => {
    if (picked !== null) return
    setPicked(idx)
    onResult({ correct: options[idx].ok })
  }
  useNumberKeys(options.length, pick, picked === null)

  const next = () => {
    setPicked(null)
    if (i + 1 >= items.length) onDone()
    else setI(i + 1)
  }

  return (
    <div className="enc">
      <h3 className="enc-title">Gespräch</h3>
      <div className="bubble npc">
        <span className="who">{npcEmoji}</span>
        {item.npc}
      </div>
      <p className="task">🎯 {item.task}</p>
      <div className="choices">
        {options.map((o, idx) => (
          <button
            key={o.text}
            className={`choice long ${picked !== null ? (o.ok ? 'right' : idx === picked ? 'wrong' : 'dim') : ''}`}
            onClick={() => pick(idx)}
          >
            <span className="key">{idx + 1}</span>
            {o.text}
          </button>
        ))}
      </div>
      {picked !== null && (
        <Next onNext={next}>
          <div className={`fb ${options[picked].ok ? 'ok' : 'bad'}`}>{options[picked].why}</div>
        </Next>
      )}
    </div>
  )
}
