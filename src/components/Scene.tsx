import { useState } from 'react'
import type { Station, Word } from '../types'
import { Highlighted, WordCard, useEnter } from './ui'
import { withArticle } from '../data'

/** The story beat at the start of a station: new words appear in context, tap to inspect. */
export function Scene({ station, words, onStart }: { station: Station; words: Record<string, Word>; onStart: () => void }) {
  const [shown, setShown] = useState(1)
  const [card, setCard] = useState<Word | null>(null)
  const done = shown >= station.scene.length

  useEnter(() => (done ? onStart() : setShown(shown + 1)), !card)

  return (
    <div className="scene">
      <div className="scene-head">
        <span className="scene-emoji">{station.character.emoji}</span>
        <div>
          <div className="scene-name">{station.character.name}</div>
          <div className="muted">{station.character.role}</div>
        </div>
      </div>
      <div className="dialogue">
        {station.scene.slice(0, shown).map((l, i) => (
          <div key={i} className={`bubble ${l.who} appear`}>
            <Highlighted text={l.text} onWord={(id) => setCard(words[id])} />
          </div>
        ))}
      </div>
      {!done ? (
        <button className="btn ghost" onClick={() => setShown(shown + 1)}>
          … ↵
        </button>
      ) : (
        <div className="scene-end appear">
          <p className="muted">Neue Wörter – tippe für Details:</p>
          <div className="chips">
            {station.words.map((id) => (
              <button key={id} className={`chip ${words[id].article ? 'a-' + words[id].article : ''}`} onClick={() => setCard(words[id])}>
                {withArticle(words[id])}
              </button>
            ))}
          </div>
          <button className="btn big" onClick={onStart}>
            Los geht's ↵
          </button>
        </div>
      )}
      {card && <WordCard word={card} onClose={() => setCard(null)} />}
    </div>
  )
}
