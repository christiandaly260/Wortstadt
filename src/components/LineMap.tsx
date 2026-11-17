import { useState } from 'react'
import type { District, Word } from '../types'
import { dueWords, fog, useProgress } from '../game/progress'
import { withArticle } from '../data'
import { WordCard } from './ui'
import { Board, Hud } from './Fx'

export type LineTarget = { kind: 'station'; id: string } | { kind: 'boss' } | { kind: 'challenge' } | { kind: 'review' }

const BOX_LABEL = ['neu', '●', '●●', '●●●', '●●●●', '●●●●●']

export function LineMap({ district, onGo, onBack }: { district: District; onGo: (t: LineTarget) => void; onBack: () => void }) {
  const s = useProgress()
  const [showWords, setShowWords] = useState(false)
  const [card, setCard] = useState<Word | null>(null)
  const firstOpen = district.stations.findIndex((st) => !s.stations[st.id])
  const allStations = firstOpen === -1
  const stars = s.stars[district.id] ?? 0
  const due = dueWords(district, s)
  const fogLevel = fog(district, s)

  return (
    <div className="line-screen" style={{ ['--line' as string]: district.color }}>
      <header className="run-head">
        <button className="icon-btn" onClick={onBack} aria-label="Zur Karte">
          ←
        </button>
        <Hud compact />
      </header>

      <Board
        line={district.line}
        text={district.name.toUpperCase()}
        sub={
          allStations
            ? stars > 0
              ? `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}  ${district.subtitle}`
              : 'Nächster Halt: Endstation'
            : `Nächster Halt: ${district.stations[firstOpen].name}`
        }
      />

      {due.length > 0 && (
        <button className="fog-banner" onClick={() => onGo({ kind: 'review' })}>
          <span className="fog-swirl">🌫️</span>
          <span>
            <strong>Nebel {Math.round(fogLevel * 100)}%</strong>
            <br />
            {due.length === 1 ? '1 Wort verblasst' : `${due.length} Wörter verblassen`}. Jetzt auffrischen
          </span>
        </button>
      )}

      <ol className="line">
        {district.stations.map((st, idx) => {
          const cleared = !!s.stations[st.id]
          const open = cleared || idx === firstOpen
          return (
            <li key={st.id} className={`stop ${cleared ? 'cleared' : open ? 'open' : 'locked'}`}>
              <span className="stop-dot" />
              <button className="stop-btn" disabled={!open} onClick={() => onGo({ kind: 'station', id: st.id })}>
                <span className="stop-name">
                  {st.name}
                  {cleared && <span className="stop-check">✓</span>}
                </span>
                <span className="stop-meta">
                  {st.character.emoji} {st.character.name}, {st.words.length} Wörter
                </span>
              </button>
            </li>
          )
        })}
        <li className={`stop boss ${stars > 0 ? 'cleared' : allStations ? 'open' : 'locked'}`}>
          <span className="stop-dot" />
          <button className="stop-btn" disabled={!allStations} onClick={() => onGo({ kind: 'boss' })}>
            <span className="stop-name">Endstation: {district.boss.name}</span>
            <span className="stop-meta">
              {district.boss.character.emoji} {district.boss.character.name}, auf Zeit
            </span>
          </button>
        </li>
        <li className={`stop bonus ${stars >= 3 ? 'cleared' : stars > 0 ? 'open' : 'locked'}`}>
          <span className="stop-dot" />
          <button className="stop-btn" disabled={stars === 0} onClick={() => onGo({ kind: 'challenge' })}>
            <span className="stop-name">Bonus: {district.challenge.name}</span>
            <span className="stop-meta">Formelles Deutsch für den dritten Stern</span>
          </button>
        </li>
      </ol>

      <button className="btn ghost" onClick={() => setShowWords(!showWords)}>
        {showWords ? 'Wortschatz ausblenden' : `Wortschatz (${district.words.length})`}
      </button>
      {showWords && (
        <ul className="vocab">
          {district.words.map((w) => {
            const p = s.words[w.id]
            return (
              <li key={w.id} onClick={() => setCard(w)}>
                <span className={w.article && !w.pluralOnly ? `a-${w.article}` : ''}>{withArticle(w)}</span>
                <span className="muted">{w.en}</span>
                <span className="box" title="Lernstand">
                  {s.seen[w.id] || p ? BOX_LABEL[p?.box ?? 0] : '–'}
                </span>
              </li>
            )
          })}
        </ul>
      )}
      {card && <WordCard word={card} onClose={() => setCard(null)} />}
    </div>
  )
}
