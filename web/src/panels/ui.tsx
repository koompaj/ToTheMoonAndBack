// OWNER: dashboard + AI workstream.
// Small shared UI pieces: one colour per meaning (fuel type, pillar, evidence vs gap), used the
// same way on every tab so a colour always says the same thing.
import type { ReactNode } from 'react'
import type { FuelClass, Pillar } from '../types/data'

export const FUEL_LABEL: Record<FuelClass, string> = { solid: 'Solid materials', droplet: 'Fuel droplets', gas: 'Gas flames' }
export const FUEL_SHORT: Record<FuelClass, string> = { solid: 'Solid', droplet: 'Droplet', gas: 'Gas' }
export const PILLAR_LABEL: Record<Pillar, string> = { prevention: 'Prevention', detection: 'Detection', suppression: 'Suppression' }
export const PILLAR_HINT: Record<Pillar, string> = {
  prevention: 'Stopping fires starting: how easily materials burn',
  detection: 'Spotting a fire early: smoke and particles',
  suppression: 'Putting a fire out: extinguishing agents',
}

export function FuelDot({ fuel }: { fuel: FuelClass }) {
  return <span className={`dot dot-${fuel}`} aria-hidden />
}

export function FuelTag({ fuel }: { fuel: FuelClass | null }) {
  if (!fuel) return null
  return (
    <span className={`tag tag-${fuel}`}>
      <FuelDot fuel={fuel} />
      {FUEL_SHORT[fuel]}
    </span>
  )
}

export function PillarTag({ pillar }: { pillar: Pillar | null }) {
  if (!pillar) return <span className="tag tag-none">Pillar not stated</span>
  return (
    <span className={`tag tag-${pillar}`} title={PILLAR_HINT[pillar]}>
      {PILLAR_LABEL[pillar]}
    </span>
  )
}

/** A row of toggle buttons. Uses aria-pressed (not tabs), so it works with Tab and Enter/Space. */
export function Choice<T extends string>({
  options,
  value,
  onChange,
  label,
  className = '',
}: {
  options: { id: T; label: ReactNode; title?: string; tone?: string }[]
  value: T
  onChange: (v: T) => void
  label: string
  className?: string
}) {
  return (
    <div className={`choice ${className}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          title={o.title}
          className={`${value === o.id ? 'on' : ''} ${o.tone ? `tone-${o.tone}` : ''}`}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** A big number with a plain-English label. Tone sets the colour: gap, evidence, solid, gas, accent. */
export function Kpi({ value, label, tone, children }: { value: ReactNode; label: string; tone: string; children?: ReactNode }) {
  return (
    <div className={`kpi kpi-${tone}`}>
      <span className="kpi-dot" aria-hidden />
      <div className="kpi-body">
        <div className="kpi-value">{value}</div>
        <div className="kpi-label">{label}</div>
        {children && <div className="kpi-cite">{children}</div>}
      </div>
    </div>
  )
}

/** The rounded header bar every card starts with: a gold circle, a title, three colour dots. */
export function PanelHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="panel-head">
      <span className="panel-dot" aria-hidden />
      <span className="panel-head-title">{title}</span>
      <span className="panel-head-right">
        {children}
        <span className="head-dots" aria-hidden>
          <i className="d1" />
          <i className="d2" />
          <i className="d3" />
        </span>
      </span>
    </div>
  )
}

/** Numbered section heading inside a panel, coloured by what the section holds. */
export function Step({ n, title, tone, children }: { n: number; title: string; tone: string; children: ReactNode }) {
  return (
    <div className={`step step-${tone}`}>
      <h3 className="step-title">
        <span className="step-n" aria-hidden>
          {n}
        </span>
        {title}
      </h3>
      {children}
    </div>
  )
}

export function ViewHead({
  eyebrow,
  title,
  lead,
  art,
  children,
}: {
  eyebrow: string
  title: string
  lead?: ReactNode
  art?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="view-hero">
      <PanelHead title={eyebrow} />
      <div className="view-head">
        <div className="view-head-text">
          <h1>{title}</h1>
          {lead && <p className="lead">{lead}</p>}
          {children && <div className="view-head-tools">{children}</div>}
        </div>
        {art && <div className="view-art">{art}</div>}
      </div>
    </div>
  )
}
