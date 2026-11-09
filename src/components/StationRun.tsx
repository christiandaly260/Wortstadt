import { useEffect, useMemo, useRef, useState } from 'react'
import type { District, Encounter, Result, Station, Word } from '../types'
import { wordMap } from '../data'
import { clearStation, getState, markSeen, recordAnswer } from '../game/progress'
import { playFanfare, playRight, playWrong } from '../game/sound'
import { Scene } from './Scene'
import { Dots, Patience, shuffle, useEnter } from './ui'
import { Artikel } from './encounters/Artikel'
import { Lueckentext } from './encounters/Lueckentext'
import { Gespraech, Kollokation } from './encounters/Choice'
import { Schmiede } from './encounters/Schmiede'

type Phase = { kind: 'scene' } | { kind: 'enc'; index: number } | { kind: 'won' } | { kind: 'lost' }

export function StationRun({ district, station, onExit }: { district: District; station: Station; onExit: () => void }) {
  const words = useMemo(() => wordMap(district), [district])
  const alreadyCleared = !!getState().stations[station.id]
  const [phase, setPhase] = useState<Phase>(alreadyCleared ? { kind: 'enc', index: 0 } : { kind: 'scene' })
  const [patience, setPatience] = useState(station.character.patience)
  const patienceRef = useRef(patience)
  patienceRef.current = patience
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [stats, setStats] = useState({ right: 0, wrong: 0 })
  const [attempt, setAttempt] = useState(0)

  // Mix a few nouns from earlier stations into the article rush, so old words keep coming back.
  const extraNouns = useMemo(() => {
    const idx = district.stations.findIndex((s) => s.id === station.id)
    const earlier = district.stations.slice(0, idx).flatMap((s) => s.words)
    return shuffle(earlier.map((id) => words[id]).filter((w) => w.article && !w.pluralOnly)).slice(0, 3)
  }, [district, station, words])

  const onResult = (r: Result) => {
    recordAnswer(r.wordId, r.correct, district.id)
    if (r.correct) {
      const c = combo + 1
      setCombo(c)
      setBestCombo((b) => Math.max(b, c))
      playRight(c)
      setStats((s) => ({ ...s, right: s.right + 1 }))
    } else {
      setCombo(0)
      playWrong()
      setPatience((p) => p - 1)
      setStats((s) => ({ ...s, wrong: s.wrong + 1 }))
    }
  }

  useEffect(() => {
    if (patience <= 0 && phase.kind === 'enc') {
      const t = setTimeout(() => setPhase({ kind: 'lost' }), 1200)
      return () => clearTimeout(t)
    }
  }, [patience, phase])

  const nextEncounter = (index: number) => {
    if (patienceRef.current <= 0) return
    if (index + 1 >= station.encounters.length) {
      clearStation(station.id)
      playFanfare()
      setPhase({ kind: 'won' })
    } else setPhase({ kind: 'enc', index: index + 1 })
  }

  const retry = () => {
    setPatience(station.character.patience)
    setCombo(0)
    setStats({ right: 0, wrong: 0 })
    setAttempt((a) => a + 1)
    setPhase({ kind: 'enc', index: 0 })
  }

  const renderEncounter = (enc: Encounter, index: number) => {
    const props = { onResult, onDone: () => nextEncounter(index) }
    const pick = (ids: string[]): Word[] => ids.map((id) => words[id])
    switch (enc.type) {
      case 'artikel':
        return <Artikel {...props} words={[...pick(enc.words), ...extraNouns]} />
      case 'lueckentext':
        return <Lueckentext {...props} words={pick(enc.words)} />
      case 'kollokation':
        return <Kollokation {...props} items={enc.items} />
      case 'gespraech':
        return <Gespraech {...props} items={enc.items} npcEmoji={station.character.emoji} />
      case 'schmiede':
        return <Schmiede {...props} items={enc.items} />
    }
  }

  return (
    <div className="run" style={{ ['--line' as string]: district.color }}>
      <header className="run-head">
        <button className="icon-btn" onClick={onExit} aria-label="Zurück">
          ✕
        </button>
        <div className="run-title">
          <span className="line-badge">{district.line}</span> {station.name}
        </div>
        <Patience character={station.character} left={patience} />
      </header>
      {phase.kind === 'enc' && (
        <div className="run-sub">
          <Dots total={station.encounters.length} current={phase.index} />
          {combo >= 3 && <span className="combo" key={combo}>🔥 ×{combo}</span>}
        </div>
      )}

      <main className="run-body">
        {phase.kind === 'scene' && (
          <Scene
            station={station}
            words={words}
            onStart={() => {
              markSeen(station.words)
              setPhase({ kind: 'enc', index: 0 })
            }}
          />
        )}
        {phase.kind === 'enc' && <div key={`${attempt}-${phase.index}`}>{renderEncounter(station.encounters[phase.index], phase.index)}</div>}
        {phase.kind === 'lost' && <Lost station={station} onRetry={retry} onExit={onExit} />}
        {phase.kind === 'won' && <Won station={station} words={words} stats={stats} bestCombo={bestCombo} onExit={onExit} />}
      </main>
    </div>
  )
}

function Lost({ station, onRetry, onExit }: { station: Station; onRetry: () => void; onExit: () => void }) {
  useEnter(onRetry)
  return (
    <div className="endcard lost appear">
      <div className="endcard-emoji">{station.character.emoji}</div>
      <blockquote>„{station.character.kickout}“</blockquote>
      <p className="muted">Die Geduld von {station.character.name} ist aufgebraucht.</p>
      <button className="btn big" onClick={onRetry}>
        🎫 Neue Nummer ziehen ↵
      </button>
      <button className="btn ghost" onClick={onExit}>
        Zurück zur Linie
      </button>
    </div>
  )
}

function Won({
  station,
  words,
  stats,
  bestCombo,
  onExit,
}: {
  station: Station
  words: Record<string, Word>
  stats: { right: number; wrong: number }
  bestCombo: number
  onExit: () => void
}) {
  useEnter(onExit)
  const total = stats.right + stats.wrong
  const pct = total ? Math.round((stats.right / total) * 100) : 100
  return (
    <div className="endcard won appear">
      <div className="endcard-emoji">🚇</div>
      <h2>Station geschafft!</h2>
      <div className="statrow">
        <div>
          <strong>{pct}%</strong>
          <span>richtig</span>
        </div>
        <div>
          <strong>{bestCombo}</strong>
          <span>beste Serie</span>
        </div>
        <div>
          <strong>{station.words.length}</strong>
          <span>Wörter</span>
        </div>
      </div>
      <div className="chips">
        {station.words.map((id) => (
          <span key={id} className="chip static">
            {words[id].de}
          </span>
        ))}
      </div>
      <button className="btn big" onClick={onExit}>
        Weiterfahren ↵
      </button>
    </div>
  )
}
