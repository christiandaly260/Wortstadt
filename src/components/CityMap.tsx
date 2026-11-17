import { useState } from 'react'
import { Board, Hud } from './Fx'
import { districtName, districts, isUnlocked, mapNodes } from '../data'
import { fog, learnedCount, resetProgress, toggleMute, useProgress } from '../game/progress'

// Fixed pseudo-random star field for the night sky.
const STARS: [number, number, number][] = Array.from({ length: 40 }, (_, i) => [
  (i * 97) % 400,
  (i * 61 + 17) % 460,
  i % 5 === 0 ? 1.4 : 0.8,
])

export function CityMap({ onOpen }: { onOpen: (districtId: string) => void }) {
  const s = useProgress()
  const [toast, setToast] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const totalStars = Object.values(s.stars).reduce((a, b) => a + b, 0)

  const say = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }

  const tap = (id: string) => {
    const node = mapNodes.find((n) => n.id === id)!
    const d = districts.find((x) => x.id === node.districtId)
    if (!d) return say(`🚧 ${node.name} (${node.theme}) ist noch eine Baustelle.`)
    if (!isUnlocked(d, s.stars)) {
      const missing = (d.requires ?? []).filter((r) => !s.stars[r]).map(districtName)
      return say(`🔒 ${node.name} öffnet, wenn du ${missing.join(' und ')} geschafft hast.`)
    }
    onOpen(d.id)
  }

  return (
    <div className="city">
      <header className="city-head">
        <Board text="WORTSTADT" sub="München, ein Wort nach dem anderen" />
        <button className="icon-btn" onClick={toggleMute} aria-label={s.muted ? 'Ton an' : 'Ton aus'}>
          {s.muted ? '🔇' : '🔊'}
        </button>
      </header>

      <Hud />

      <svg className="map" viewBox="0 0 400 460" role="img" aria-label="Karte von München">
        <defs>
          <filter id="fog" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        {STARS.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} className="sky-star" style={{ animationDelay: `${(i % 7) * 0.6}s` }} />
        ))}
        {/* Isar */}
        <path d="M 250 0 C 245 70, 285 110, 270 170 S 225 250, 250 300 S 300 380, 280 460" className="isar" />
        <text x="285" y="400" className="isar-label">
          Isar
        </text>
        {/* Rails from the centre to every district */}
        {mapNodes.map((n) => {
          const d = districts.find((x) => x.id === n.districtId)
          const open = d && isUnlocked(d, s.stars)
          return (
            <line
              key={`r-${n.id}`}
              x1={200}
              y1={235}
              x2={n.x}
              y2={n.y}
              className={open ? 'rail live' : 'rail'}
              style={open ? { stroke: d.color, color: d.color } : undefined}
            />
          )
        })}
        <circle cx={200} cy={235} r={7} className="centre" />
        <text x={200} y={222} className="centre-label">
          Marienplatz
        </text>
        {mapNodes.map((n) => {
          const found = n.districtId ? districts.find((x) => x.id === n.districtId) : undefined
          const d = found && isUnlocked(found, s.stars) ? found : undefined
          const st = d ? (s.stars[d.id] ?? 0) : 0
          const f = d ? fog(d, s) : 0
          return (
            <g key={n.id} className={`node ${d ? 'live' : 'locked'}`} onClick={() => tap(n.id)} style={{ cursor: 'pointer' }}>
              {d && <circle cx={n.x} cy={n.y} r={26} className="node-glow" style={{ fill: d.color }} />}
              <circle cx={n.x} cy={n.y} r={d ? 18 : found ? 13 : 9} className="node-dot" style={d ? { fill: d.color } : undefined} />
              <text x={n.x} y={n.y + 5} className="node-icon">
                {d ? d.line : found ? '🔒' : ''}
              </text>
              {f > 0.2 && (
                <>
                  <circle cx={n.x} cy={n.y} r={28} className="fog" filter="url(#fog)" style={{ opacity: Math.min(0.7, 0.3 + f * 0.45) }} />
                  <text x={n.x + 22} y={n.y - 14} className="fog-icon">
                    🌫️
                  </text>
                </>
              )}
              <text x={n.x} y={n.y + (d ? 34 : 28)} className="node-label">
                {n.name}
                {n.bonus ? ' ✦' : ''}
              </text>
              {d && (
                <text x={n.x} y={n.y + 47} className="node-stars">
                  {'★'.repeat(st) + '☆'.repeat(3 - st)}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      <div className="city-stats">
        <div>
          <strong>{learnedCount(s)}</strong>
          <span>Wörter sitzen</span>
        </div>
        <div>
          <strong>{totalStars}</strong>
          <span>Sterne</span>
        </div>
        <div>
          <strong>
            {districts.filter((d) => (s.stars[d.id] ?? 0) > 0).length}/{mapNodes.filter((n) => !n.bonus).length}
          </strong>
          <span>Viertel</span>
        </div>
      </div>
      <p className="muted center small">Tippe auf ein Viertel, um einzusteigen.</p>

      <div className="center">
        {confirmReset ? (
          <span className="small">
            Wirklich alles löschen?{' '}
            <button
              className="link danger"
              onClick={() => {
                resetProgress()
                setConfirmReset(false)
              }}
            >
              Ja
            </button>{' '}
            <button className="link" onClick={() => setConfirmReset(false)}>
              Nein
            </button>
          </span>
        ) : (
          <button className="link small" onClick={() => setConfirmReset(true)}>
            Fortschritt zurücksetzen
          </button>
        )}
      </div>

      {toast && <div className="toast appear">{toast}</div>}
    </div>
  )
}
