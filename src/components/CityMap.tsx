import { useState } from 'react'
import { districts, mapNodes } from '../data'
import { fog, learnedCount, resetProgress, toggleMute, useProgress } from '../game/progress'

export function CityMap({ onOpen }: { onOpen: (districtId: string) => void }) {
  const s = useProgress()
  const [toast, setToast] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const totalStars = Object.values(s.stars).reduce((a, b) => a + b, 0)

  const tap = (id: string) => {
    const node = mapNodes.find((n) => n.id === id)!
    if (node.districtId) onOpen(node.districtId)
    else {
      setToast(`🚧 ${node.name} (${node.theme}) ist noch eine Baustelle.`)
      setTimeout(() => setToast(null), 2200)
    }
  }

  return (
    <div className="city">
      <header className="city-head">
        <div>
          <h1>
            <span className="u-sign">U</span> Wortstadt
          </h1>
          <p className="muted">München, ein Wort nach dem anderen.</p>
        </div>
        <button className="icon-btn" onClick={toggleMute} aria-label="Ton">
          {s.muted ? '🔇' : '🔊'}
        </button>
      </header>

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
            {districts.filter((d) => (s.stars[d.id] ?? 0) > 0).length}/{mapNodes.length}
          </strong>
          <span>Viertel</span>
        </div>
      </div>

      <svg className="map" viewBox="0 0 400 460" role="img" aria-label="Karte von München">
        <defs>
          <filter id="fog" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        {/* Isar */}
        <path d="M 250 0 C 245 70, 285 110, 270 170 S 225 250, 250 300 S 300 380, 280 460" className="isar" />
        <text x="285" y="400" className="isar-label">
          Isar
        </text>
        {/* Rails from the centre to every district */}
        {mapNodes.map((n) => (
          <line key={`r-${n.id}`} x1={200} y1={235} x2={n.x} y2={n.y} className={n.districtId ? 'rail live' : 'rail'} />
        ))}
        <circle cx={200} cy={235} r={7} className="centre" />
        <text x={200} y={222} className="centre-label">
          Marienplatz
        </text>
        {mapNodes.map((n) => {
          const d = n.districtId ? districts.find((x) => x.id === n.districtId) : undefined
          const st = d ? (s.stars[d.id] ?? 0) : 0
          const f = d ? fog(d, s) : 0
          return (
            <g key={n.id} className={`node ${d ? 'live' : 'locked'}`} onClick={() => tap(n.id)} style={{ cursor: 'pointer' }}>
              <circle cx={n.x} cy={n.y} r={d ? 18 : 13} style={d ? { fill: d.color } : undefined} />
              <text x={n.x} y={n.y + 5} className="node-icon">
                {d ? d.line : '🚧'}
              </text>
              {f > 0.2 && (
                <>
                  <circle cx={n.x} cy={n.y} r={28} className="fog" filter="url(#fog)" style={{ opacity: Math.min(0.9, 0.35 + f * 0.6) }} />
                  <text x={n.x + 22} y={n.y - 14} className="fog-icon">
                    🌫️
                  </text>
                </>
              )}
              <text x={n.x} y={n.y + (d ? 34 : 28)} className="node-label">
                {n.name}
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

      <p className="muted center small">Tippe auf ein Viertel. Neue Viertel kommen bald dazu.</p>

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
