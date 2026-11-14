// OWNER: dashboard + AI workstream.
// Small animated charts drawn with SVG and CSS (no chart library, works offline). Bars grow in
// once on load; under reduced motion they simply appear. Colours follow the dashboard's meanings.
import type { ReactNode } from 'react'

export interface BarSeg {
  key: string
  value: number
  className: string // colour class, e.g. "fill-solid"
  label: string
}

/** One horizontal stacked bar row: a label, segments, a total, optional click. */
export function StackRow({
  label,
  sub,
  segs,
  max,
  onClick,
  delay = 0,
  empty,
}: {
  label: ReactNode
  sub?: ReactNode
  segs: BarSeg[]
  max: number
  onClick?: () => void
  delay?: number
  empty?: string
}) {
  const total = segs.reduce((n, s) => n + s.value, 0)
  const inner = (
    <>
      <span className="srow-label">
        <b>{label}</b>
        {sub && <small>{sub}</small>}
      </span>
      <span className="srow-track">
        {total === 0 ? (
          <span className="srow-empty">{empty ?? 'No tests'}</span>
        ) : (
          <span className="srow-bar grow-x" style={{ width: `${(total / max) * 100}%`, animationDelay: `${delay}ms` }}>
            {segs
              .filter((s) => s.value > 0)
              .map((s) => (
                <i key={s.key} className={s.className} style={{ flexGrow: s.value }} title={`${s.label}: ${s.value}`} />
              ))}
          </span>
        )}
      </span>
      <span className="srow-total">{total}</span>
    </>
  )
  return onClick ? (
    <button type="button" className="srow srow-btn" onClick={onClick}>
      {inner}
    </button>
  ) : (
    <div className="srow">{inner}</div>
  )
}

/** Vertical histogram with stacked series and optional shaded bands. */
export function Histogram({
  bins,
  series,
  bands = [],
  xLabel,
  format,
}: {
  bins: { x0: number; x1: number; values: Record<string, number> }[]
  series: { key: string; className: string; label: string }[]
  bands?: { from: number; to: number; className: string; label: string }[]
  xLabel: string
  format: (x: number) => string
}) {
  const W = 560
  const H = 220
  const P = { l: 34, r: 8, t: 22, b: 34 }
  const lo = bins[0]?.x0 ?? 0
  const hi = bins[bins.length - 1]?.x1 ?? 1
  const max = Math.max(1, ...bins.map((b) => series.reduce((n, s) => n + (b.values[s.key] ?? 0), 0)))
  const x = (v: number) => P.l + ((v - lo) / (hi - lo)) * (W - P.l - P.r)
  const y = (v: number) => P.t + (1 - v / max) * (H - P.t - P.b)
  const bw = (W - P.l - P.r) / bins.length
  const ticks = [0, Math.round(max / 2), max]
  return (
    <svg className="hist" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Histogram of tests by ${xLabel}`}>
      {bands.map((b) => (
        <g key={b.label}>
          <rect className={b.className} x={x(Math.max(b.from, lo))} y={P.t - 14} width={Math.max(0, x(Math.min(b.to, hi)) - x(Math.max(b.from, lo)))} height={H - P.b - P.t + 14} />
          <text className="band-label" x={x(Math.max(b.from, lo)) + 6} y={P.t - 3}>
            {b.label}
          </text>
        </g>
      ))}
      {ticks.map((t) => (
        <g key={t}>
          <line className="grid" x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} />
          <text className="tick" x={P.l - 6} y={y(t) + 4} textAnchor="end">
            {t}
          </text>
        </g>
      ))}
      {bins.map((b, i) => {
        let acc = 0
        return (
          <g key={i} className="grow-y" style={{ animationDelay: `${i * 18}ms`, transformOrigin: `0 ${y(0)}px` }}>
            {series.map((s) => {
              const v = b.values[s.key] ?? 0
              if (!v) return null
              const top = y(acc + v)
              const h = y(acc) - top
              acc += v
              return (
                <rect key={s.key} className={s.className} x={x(b.x0) + 1} y={top} width={Math.max(1, bw - 2)} height={h} rx={1.5}>
                  <title>{`${format(b.x0)}–${format(b.x1)}: ${v} ${s.label}`}</title>
                </rect>
              )
            })}
          </g>
        )
      })}
      {bins
        .filter((_, i) => i % 5 === 0)
        .map((b) => (
          <text key={b.x0} className="tick" x={x(b.x0)} y={H - P.b + 16} textAnchor="middle">
            {format(b.x0)}
          </text>
        ))}
      <text className="axis" x={(P.l + W - P.r) / 2} y={H - 4} textAnchor="middle">
        {xLabel}
      </text>
    </svg>
  )
}

/** A donut of parts; each slice can be clicked. */
export function Donut({
  parts,
  centre,
  sub,
  onPick,
}: {
  parts: { key: string; value: number; className: string; label: string }[]
  centre: ReactNode
  sub: string
  onPick?: (key: string) => void
}) {
  const total = parts.reduce((n, p) => n + p.value, 0) || 1
  const R = 70
  const C = 2 * Math.PI * R
  let off = 0
  return (
    <div className="donut-wrap">
      <svg className="donut" viewBox="0 0 200 200" role="img" aria-label="Share of tests by fuel type">
        <circle cx="100" cy="100" r={R} className="donut-bg" />
        {parts.map((p, i) => {
          const len = (p.value / total) * C
          const el = (
            <circle
              key={p.key}
              cx="100"
              cy="100"
              r={R}
              className={`donut-seg ${p.className}`}
              strokeDasharray={`${Math.max(0, len - 3)} ${C}`}
              strokeDashoffset={-off}
              style={{ animationDelay: `${i * 120}ms` }}
              onClick={onPick ? () => onPick(p.key) : undefined}
            >
              <title>{`${p.label}: ${p.value}`}</title>
            </circle>
          )
          off += len
          return el
        })}
        <text x="100" y="98" textAnchor="middle" className="donut-centre">
          {centre}
        </text>
        <text x="100" y="120" textAnchor="middle" className="donut-sub">
          {sub}
        </text>
      </svg>
      <ul className="donut-legend">
        {parts.map((p) => (
          <li key={p.key}>
            {onPick ? (
              <button type="button" onClick={() => onPick(p.key)}>
                <i className={`sw ${p.className}`} /> {p.label} <b>{p.value.toLocaleString('en')}</b>
              </button>
            ) : (
              <>
                <i className={`sw ${p.className}`} /> {p.label} <b>{p.value.toLocaleString('en')}</b>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
