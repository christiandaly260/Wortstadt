import { useEffect, useRef, useState } from 'react'
import { onFx } from '../game/fx'
import { currentStreak, rankInfo, useProgress } from '../game/progress'
import { playLevelUp, playWhoosh } from '../game/sound'

/** Floating "+12 XP" pop-ups, the level-up banner and screen shake. Mounted once in App. */
export function FxLayer() {
  const [pops, setPops] = useState<{ id: number; amount: number; label?: string }[]>([])
  const [levelUp, setLevelUp] = useState<{ rank: string; level: number } | null>(null)
  const id = useRef(0)
  const pending = useRef<{ rank: string; level: number } | null>(null)

  // Hold a level-up until the player is between questions (a result screen or a map),
  // so the banner never interrupts an answer.
  useEffect(() => {
    const t = setInterval(() => {
      if (!pending.current) return
      if (document.querySelector('.endcard.won, .city, .line-screen')) {
        const lv = pending.current
        pending.current = null
        setTimeout(() => {
          playLevelUp()
          setLevelUp(lv)
        }, 900)
      }
    }, 300)
    return () => clearInterval(t)
  }, [])

  useEffect(
    () =>
      onFx((e) => {
        if (e.type === 'xp') {
          const pid = ++id.current
          setPops((p) => [...p.slice(-4), { id: pid, amount: e.amount, label: e.label }])
          setTimeout(() => setPops((p) => p.filter((x) => x.id !== pid)), 1100)
        } else if (e.type === 'levelup') {
          pending.current = { rank: e.rank, level: e.level }
        } else if (e.type === 'shake') {
          const root = document.getElementById('root')
          root?.classList.remove('shake')
          void root?.offsetWidth
          root?.classList.add('shake')
        }
      }),
    [],
  )

  // While the level-up banner is open, Enter only closes the banner.
  useEffect(() => {
    if (!levelUp) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault()
        e.stopImmediatePropagation()
        setLevelUp(null)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [levelUp])

  return (
    <>
      <div className="xp-pops" aria-hidden>
        {pops.map((p) => (
          <div key={p.id} className="xp-pop">
            +{p.amount} XP{p.label ? <span> {p.label}</span> : null}
          </div>
        ))}
      </div>
      {levelUp && (
        <div className="overlay levelup" onClick={() => setLevelUp(null)}>
          <div className="levelup-card">
            <div className="levelup-level">Level {levelUp.level}</div>
            <Board text="NEUER RANG" />
            <h2>{levelUp.rank}</h2>
            <button className="btn big" onClick={() => setLevelUp(null)}>
              Weiter
            </button>
          </div>
        </div>
      )}
    </>
  )
}

/** Player status: rank, XP bar and daily streak. */
export function Hud({ compact = false }: { compact?: boolean }) {
  const s = useProgress()
  const r = rankInfo(s.xp)
  const streak = currentStreak(s)
  return (
    <div className={`hud ${compact ? 'compact' : ''}`}>
      <div className="hud-level" title={`Level ${r.level}`}>
        {r.level}
      </div>
      <div className="hud-main">
        <div className="hud-row">
          <span className="hud-rank">{r.name}</span>
          <span className="hud-xp">{s.xp.toLocaleString('de-DE')} XP</span>
        </div>
        <div className="hud-bar">
          <div className="hud-bar-fill" style={{ width: `${r.progress * 100}%` }} />
        </div>
        {!compact && r.next && <div className="hud-next">noch {r.toNext} XP bis {r.next}</div>}
      </div>
      <div className={`hud-streak ${streak > 0 ? 'on' : ''}`} title="Tage in Folge">
        <span>🔥</span>
        {streak}
      </div>
    </div>
  )
}

/** A strip of LED departure-board text. Letters flip in one by one. */
export function Board({ text, sub, line }: { text: string; sub?: string; line?: string }) {
  return (
    <div className="board" role="img" aria-label={sub ? `${text}, ${sub}` : text}>
      {line && <span className="board-line">{line}</span>}
      <span className="board-text">
        {[...text].map((ch, i) => (
          <span key={i} className="board-ch" style={{ animationDelay: `${i * 28}ms` }}>
            {ch === ' ' ? ' ' : ch}
          </span>
        ))}
      </span>
      {sub && <span className="board-sub">{sub}</span>}
    </div>
  )
}

/** The train pulling into the station: plays on entering a station, boss or challenge. */
export function TrainArrival({ line, color, dest, onDone }: { line: string; color: string; dest: string; onDone: () => void }) {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      onDone()
      return
    }
    playWhoosh()
    const t = setTimeout(onDone, 1250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className="arrival" style={{ ['--line' as string]: color }} onClick={onDone}>
      <div className="arrival-platform">
        <div className="arrival-train">
          <div className="train-car">
            <div className="train-sign">
              <span className="board-line">{line}</span> {dest}
            </div>
            <div className="train-windows">
              <span />
              <span />
              <span className="door" />
              <span />
              <span />
            </div>
          </div>
          <div className="train-car">
            <div className="train-windows">
              <span />
              <span />
              <span className="door" />
              <span />
              <span />
            </div>
          </div>
        </div>
        <div className="arrival-rail" />
      </div>
    </div>
  )
}
