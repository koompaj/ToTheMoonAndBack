// OWNER: dashboard + AI workstream.
// Step 2 of the flow: one place crews live. A summary of the NASA tests that ran in its air, then
// a choice of fuel type (step 3) that opens the fire page for that place and fuel.
import { useEffect } from 'react'
import type { AppData, FuelClass } from '../types/data'
import type { AiContent } from '../ai/content'
import { isSourced, testsInHabitat } from '../data/load'
import { useApp } from '../state/store'
import { fmtPct, fmtPsi } from '../ai/evidence'
import { HabitatPanel } from './HabitatPanel'
import { useHashParam } from './route'
import { placeArt, placeName } from './places'
import { PlaceArt, Stars } from './SpaceArt'
import { FUEL_LABEL, FuelDot, PanelHead } from './ui'

const FUELS: FuelClass[] = ['gas', 'droplet', 'solid']
const FUEL_WHAT: Record<FuelClass, string> = {
  gas: 'Gas leaking from a line or tank and burning as a flame.',
  droplet: 'Liquid fuel in drops, such as a spilled solvent or fuel.',
  solid: 'Fabrics, plastics, foam and paper: what a habitat is built and furnished with.',
}

export function PlaceView({ data, ai }: { data: AppData; ai: AiContent }) {
  const [hid] = useHashParam('h', 'moon_base')
  const selectHabitat = useApp((s) => s.selectHabitat)
  const hab = data.habitats.find((h) => h.id === hid) ?? null
  useEffect(() => {
    if (hab) selectHabitat(hab.id)
  }, [hab, selectHabitat])

  if (!hab)
    return (
      <section className="view">
        <p className="empty-state">
          This place has no NASA air numbers yet. <a href="#map">Back to all places</a>
        </p>
      </section>
    )

  const inside = testsInHabitat(data.tests, hab)
  const name = placeName(hab.id, hab.name)
  const o2 = hab.o2_fraction[0] === hab.o2_fraction[1] ? fmtPct(hab.o2_fraction[0], 0) : `${fmtPct(hab.o2_fraction[0], 0)} – ${fmtPct(hab.o2_fraction[1], 0)}`
  const p = hab.pressure_psi[0] === hab.pressure_psi[1] ? `${hab.pressure_psi[0]} psi` : `${hab.pressure_psi[0]} – ${hab.pressure_psi[1]} psi`

  return (
    <section className="view" aria-labelledby="place-title">
      <nav className="crumbs" aria-label="Breadcrumb">
        <a href="#map">Home</a> <span aria-hidden>›</span> <span aria-current="page">{name}</span>
      </nav>

      <div className="view-hero">
        <PanelHead title="Step 2 · The Place" />
        <div className="place-hero">
          <Stars />
          <div className="view-head-text">
            <h1 id="place-title">{name}</h1>
            <div className="cond-pills">
              <span className="cond-pill">
                <small>Oxygen</small>
                {o2}
              </span>
              <span className="cond-pill">
                <small>Pressure</small>
                {p}
              </span>
              {!isSourced(hab) && <span className="badge warn">Needs a Source</span>}
            </div>
            <p className="lead">
              <b className="t-accent">{inside.length}</b> NASA tests ran in this air:{' '}
              {FUELS.map((f, i) => (
                <span key={f}>
                  {i > 0 && ', '}
                  <FuelDot fuel={f} /> {inside.filter((t) => t.fuel_class === f).length} {f}
                </span>
              ))}
              .
            </p>
            <p className="source-line">{hab.note}</p>
          </div>
          <div className="view-art">
            <PlaceArt kind={placeArt(hab.id)} size={210} />
          </div>
        </div>
      </div>

      <section aria-labelledby="fuel-title">
        <h2 id="fuel-title" className="section-title">
          Step 3 · Choose What Is Burning
        </h2>
        <div className="fuel-grid">
          {FUELS.map((f) => {
            const here = inside.filter((t) => t.fuel_class === f)
            const all = data.tests.filter((t) => t.fuel_class === f && t.o2_basis === 'ambient')
            const o2s = all.map((t) => t.o2_fraction).filter((v): v is number => v !== null)
            const ps = all.map((t) => t.pressure_atm).filter((v): v is number => v !== null)
            return (
              <a key={f} className={`fuel-card fuel-${f}`} href={`#fire?h=${hab.id}&fuel=${f}`}>
                <span className="fuel-card-head">
                  <FuelDot fuel={f} />
                  <b>{FUEL_LABEL[f]}</b>
                </span>
                <span className="fuel-card-what">{FUEL_WHAT[f]}</span>
                <span className="fuel-card-num">
                  {here.length}
                  <small> tests in this air</small>
                </span>
                <span className="fuel-card-range mono">
                  Tested: {o2s.length ? `${fmtPct(Math.min(...o2s))} – ${fmtPct(Math.max(...o2s))} oxygen` : 'oxygen not in tables'}
                  {' · '}
                  {ps.length ? `${fmtPsi(Math.min(...ps))} – ${fmtPsi(Math.max(...ps))}` : 'pressure not in tables'}
                </span>
                <span className="place-go">Simulate a {f} fire →</span>
              </a>
            )
          })}
        </div>
      </section>

      <HabitatPanel data={data} ai={ai} embedded />
    </section>
  )
}
