import { useMemo, useState } from 'react'
import type { Result, SchmiedeItem } from '../../types'
import { playTap } from '../../game/sound'
import { shuffle, useEnter } from '../ui'

/** Forge a word from prefix + root + suffix tiles. */
export function Schmiede({ items, onResult, onDone }: { items: SchmiedeItem[]; onResult: (r: Result) => void; onDone: () => void }) {
  const [i, setI] = useState(0)
  const item = items[i]
  const tiles = useMemo(() => shuffle(item.tiles.map((t, k) => ({ t, k }))), [item])
  const [built, setBuilt] = useState<number[]>([])
  const [result, setResult] = useState<boolean | null>(null)

  const raw = built.map((k) => item.tiles[k]).join('')
  const isNoun = /^[A-ZÄÖÜ]/.test(item.target)
  const shown = raw ? (isNoun ? raw[0].toUpperCase() + raw.slice(1).toLowerCase() : raw.toLowerCase()) : ''

  const forge = () => {
    if (result !== null || !raw) return
    const ok = raw.toLowerCase() === item.target.toLowerCase()
    setResult(ok)
    onResult({ correct: ok })
  }

  const next = () => {
    setBuilt([])
    setResult(null)
    if (i + 1 >= items.length) onDone()
    else setI(i + 1)
  }
  useEnter(result === null ? forge : next, result !== null || built.length > 0)

  return (
    <div className="enc">
      <h3 className="enc-title">Wortschmiede ⚒️</h3>
      <p className="task">Schmiede das Wort für: <strong>{item.en}</strong></p>
      <div className={`anvil ${result === null ? '' : result ? 'ok' : 'bad'}`}>
        {built.length === 0 ? (
          <span className="muted">Tippe die Bausteine an …</span>
        ) : (
          <>
            {built.map((k, pos) => (
              <button
                key={pos}
                className="tile on-anvil"
                disabled={result !== null}
                onClick={() => setBuilt(built.filter((_, p) => p !== pos))}
              >
                {item.tiles[k]}
              </button>
            ))}
          </>
        )}
      </div>
      {shown && result === null && <div className="forged-preview">{shown}</div>}
      <div className="tiles">
        {tiles.map(({ t, k }) => (
          <button
            key={k}
            className="tile"
            disabled={built.includes(k) || result !== null}
            onClick={() => {
              playTap()
              setBuilt([...built, k])
            }}
          >
            {t}
          </button>
        ))}
      </div>
      {result === null ? (
        <button className="btn" disabled={!raw} onClick={forge}>
          Schmieden ↵
        </button>
      ) : (
        <div className={`fb ${result ? 'ok' : 'bad'}`}>
          <div className="fb-title">{result ? 'Geschmiedet!' : 'Zerbrochen …'}</div>
          {!result && (
            <div className="fb-expected">
              Richtig: <strong>{item.target}</strong>
            </div>
          )}
          <button className="btn" onClick={next}>
            Weiter ↵
          </button>
        </div>
      )}
    </div>
  )
}
