// OWNER: dashboard + AI workstream.
// The habitat panel: for the selected habitat, the tests inside its oxygen/pressure box, the nearest
// evidence outside it, how the flames inside ended, and what the tables do not cover.
// Every sentence is computed from tests.json and cites its rows; AI text appears only when the
// offline generator has written it, and is labelled as a draft until a person reviews it.
import type { AppData, FuelClass, Habitat } from '../types/data'
import type { AiContent } from '../ai/content'
import { isSourced, testsInHabitat, unplacedTests } from '../data/load'
import { useApp } from '../state/store'
import { fmtPct, fmtPsi, habitatEvidence, pressureSources, pressureSourcesText, type ClassEvidence } from '../ai/evidence'
import { DoiCite, SentenceCites, TestCite } from './Cite'
import { TestDetail } from './TestDetail'
import { Choice, FUEL_LABEL, FuelDot, PanelHead, Step } from './ui'

const CLASS_NOUN: Record<FuelClass, string> = { solid: 'solid-material', droplet: 'droplet', gas: 'gas-flame' }

function n(v: number, digits = 1) {
  return v.toFixed(digits).replace(/\.0$/, '')
}

function conditions(h: Habitat) {
  const [o0, o1] = h.o2_fraction
  const [p0, p1] = h.pressure_psi
  return {
    o2: o0 === o1 ? fmtPct(o0, 0) : `${fmtPct(o0, 0)} – ${fmtPct(o1, 0)}`,
    p: p0 === p1 ? `${p0} psi` : `${p0} – ${p1} psi`,
  }
}

function ClassRow({ c, total }: { c: ClassEvidence; total: number }) {
  const count = c.inside.length
  const share = total > 0 ? count / total : 0
  return (
    <div className={`class-row fuel-${c.fuelClass}${count === 0 ? ' empty' : ''}`}>
      <FuelDot fuel={c.fuelClass} />
      <span className="class-name">{FUEL_LABEL[c.fuelClass]}</span>
      <span className="class-bar" aria-hidden>
        <i style={{ width: `${Math.max(share * 100, count > 0 ? 4 : 0)}%` }} />
      </span>
      <span className="class-count">{count === 0 ? 'None' : count}</span>
      {count > 0 && (
        <span className="class-cites">
          {c.inside.slice(0, 3).map((t) => (
            <TestCite key={t.id} test={t} />
          ))}
          {count > 3 && <span className="muted small"> +{count - 3} more</span>}
        </span>
      )}
    </div>
  )
}

function NearestRow({ c }: { c: ClassEvidence }) {
  const label = (
    <span className="near-label">
      <FuelDot fuel={c.fuelClass} />
      {FUEL_LABEL[c.fuelClass]}
    </span>
  )
  if (c.inside.length > 0)
    return (
      <li className="near near-in">
        {label}
        <span>Already inside the box ({c.inside.length} tests).</span>
      </li>
    )
  const near = c.nearest
  if (!near)
    return (
      <li className="near">
        {label}
        <span>No test of this kind records cabin-air oxygen.</span>
      </li>
    )
  const t = near.test
  if (near.oxygenOnly)
    return (
      <li className="near">
        {label}
        <span>
          {near.o2Points < 0.05
            ? `${t.acronym} ran at ${fmtPct(t.o2_fraction!)} oxygen, inside this range,`
            : `Closest: ${t.acronym} at ${fmtPct(t.o2_fraction!)} oxygen, `}
          {near.o2Points >= 0.05 && <b className="gap-num">{n(near.o2Points)} points short</b>}
          {near.o2Points >= 0.05 ? '. ' : ' '}
          No pressure is recorded for it, so it cannot be placed. <TestCite test={t} />
        </span>
      </li>
    )
  const gaps = [
    near.o2Points > 0.05 ? `${n(near.o2Points)} points of oxygen` : null,
    near.psiGap > 0.05 ? `${n(near.psiGap)} psi` : null,
  ].filter(Boolean)
  return (
    <li className="near">
      {label}
      <span>
        {t.acronym} at {fmtPct(t.o2_fraction!)} oxygen and {fmtPsi(t.pressure_atm!)}:{' '}
        <b className="gap-num">{gaps.length ? `${gaps.join(' and ')} away` : 'on the edge'}</b>. <TestCite test={t} />
      </span>
    </li>
  )
}

export function HabitatPanel({ data, ai, embedded = false }: { data: AppData; ai: AiContent; embedded?: boolean }) {
  const selectedHabitatId = useApp((s) => s.selectedHabitatId)
  const selectHabitat = useApp((s) => s.selectHabitat)
  const selectedTestId = useApp((s) => s.selectedTestId)
  const habitat = data.habitats.find((h) => h.id === selectedHabitatId) ?? null
  const selectedTest = selectedTestId ? data.tests.find((t) => t.id === selectedTestId) ?? null : null
  const ev = habitat ? habitatEvidence(data, habitat, testsInHabitat) : null
  const unplaced = unplacedTests(data.tests)
  const aiItem = habitat && ai.habitats ? ai.habitats.items[habitat.id] : undefined
  const cond = habitat ? conditions(habitat) : null

  return (
    <section className={`panel habitat-panel${embedded ? ' embedded' : ''}`} aria-labelledby="habitat-heading">
      <PanelHead title={embedded ? 'What NASA Knows Here' : 'Evidence by Habitat'} />
      {!embedded && (
        <>
          <h2 id="habitat-heading" className="eyebrow">
            Pick a Place Where Crews Live
          </h2>
          <Choice
            label="Habitat"
            value={selectedHabitatId ?? ''}
            onChange={(id) => selectHabitat(id)}
            options={data.habitats.map((h) => ({ id: h.id, label: h.name.replace(' / pressurized rover', '') }))}
            className="full"
          />
        </>
      )}
      {embedded && (
        <h2 id="habitat-heading" className="sr-only">
          What NASA knows here
        </h2>
      )}

      {selectedTest && <TestDetail test={selectedTest} data={data} />}

      {habitat && ev && cond && (
        <>
          {!embedded && (
          <div className="habitat-head">
            <h3>{habitat.name}</h3>
            <div className="cond-pills">
              <span className="cond-pill">
                <small>Oxygen</small>
                {cond.o2}
              </span>
              <span className="cond-pill">
                <small>Pressure</small>
                {cond.p}
              </span>
              {!isSourced(habitat) && <span className="badge warn">Needs a Source</span>}
            </div>
            <p className="source-line">{habitat.note}</p>
          </div>
          )}

          <Step n={1} title="Tests in This Air" tone="evidence">
            <p className="big-number">
              {ev.inside.length}
              <span className="big-unit"> {ev.point ? 'tests at exactly these values' : 'NASA tests inside the box'}</span>
            </p>
            <div className="class-rows">
              {ev.byClass.map((c) => (
                <ClassRow key={c.fuelClass} c={c} total={ev.inside.length} />
              ))}
            </div>
            {ev.byInvestigation.length > 0 && (
              <p className="inv-line">
                From{' '}
                {ev.byInvestigation.map((b, i) => (
                  <span key={b.accession}>
                    {i > 0 && ', '}
                    <b>{b.acronym}</b> ({b.count}) <DoiCite inv={data.investigations.find((x) => x.accession === b.accession)} />
                  </span>
                ))}
              </p>
            )}
            {ev.duplicatesInside > 0 && (
              <p className="muted small">{ev.duplicatesInside} of these rows repeat an earlier row of the same table exactly.</p>
            )}
          </Step>

          <Step n={2} title="Closest Evidence Outside" tone="info">
            <ul className="near-list">
              {ev.byClass.map((c) => (
                <NearestRow key={c.fuelClass} c={c} />
              ))}
            </ul>
            <p className="footnote">Distance counts 1 percentage point of oxygen the same as 1 psi of pressure.</p>
          </Step>

          <Step n={3} title="How the Flames Inside Ended" tone="accent">
            {ev.outcomes.length === 0 ? (
              <p className="muted">No test inside this box records how it ended.</p>
            ) : (
              <div className="outcome-bars">
                {ev.outcomes.map((o) => (
                  <div key={o.outcome} className="outcome">
                    <span className="outcome-label">{o.outcome}</span>
                    <span className="outcome-bar">
                      <i style={{ width: `${(o.count / ev.inside.length) * 100}%` }} />
                    </span>
                    <b>{o.count}</b>
                    <TestCite test={o.example} />
                  </div>
                ))}
                {ev.noOutcome > 0 && (
                  <div className="outcome muted">
                    <span className="outcome-label">not recorded</span>
                    <span className="outcome-bar">
                      <i className="none" style={{ width: `${(ev.noOutcome / ev.inside.length) * 100}%` }} />
                    </span>
                    <b>{ev.noOutcome}</b>
                  </div>
                )}
              </div>
            )}
            <p className="footnote">As NASA's tables record them. A pattern across oxygen and pressure has not been checked yet.</p>
          </Step>

          <Step n={4} title="Not in the Tables Yet" tone="gap">
            <ul className="gap-list">
              {ev.byClass
                .filter((c) => c.inside.length === 0)
                .map((c) => (
                  <li key={c.fuelClass}>
                    <FuelDot fuel={c.fuelClass} /> No {CLASS_NOUN[c.fuelClass]} test at these conditions.
                  </li>
                ))}
              <li>No partial-gravity tests: every test in PSI&rsquo;s tables ran in microgravity. The challenge page suggests microgravity and Earth-gravity results could bound Moon and Mars, but Earth-gravity results are not in these tables.</li>
              {unplaced.noPressureInTable.length > 0 && (
                <li>
                  {unplaced.noPressureInTable.length.toLocaleString('en')} tests come from tables with no pressure column and have no
                  single pressure from NASA&rsquo;s reports, so they cannot be placed in any box yet (
                  {unplaced.noPressureInTable.filter((t) => t.pressure_atm_min != null).length} of them have only a pressure range from a
                  NASA report or sensor log).{' '}
                  {pressureSources(data.tests.filter((t) => t.fuel_class === 'solid')).reduce((n, g) => n + g.n, 0)} solid tests from the
                  same kind of table are placed, using a pressure from another NASA document:{' '}
                  {pressureSourcesText(pressureSources(data.tests.filter((t) => t.fuel_class === 'solid')))}.
                </li>
              )}
            </ul>
            <p className="footnote">“Not in the tables” is not “never tested”: NASA's reports may hold more.</p>
          </Step>

          {aiItem && ai.habitats && (
            <div className="ai-block">
              <h3 className="step-title">
                AI Summary{' '}
                <span className={`badge ${ai.habitats.reviewed ? 'ok' : 'warn'}`}>
                  {ai.habitats.reviewed ? `Reviewed by ${ai.habitats.reviewed_by ?? 'the team'}` : 'Draft, Not Reviewed'}
                </span>
              </h3>
              {aiItem.summary.map((s, i) => (
                <p key={i}>
                  {s.text} <SentenceCites sentence={s} data={data} />
                </p>
              ))}
              <p className="footnote">
                Written by {ai.habitats.model} on {ai.habitats.generated_at.slice(0, 10)} from the numbers above only.
              </p>
            </div>
          )}
        </>
      )}
    </section>
  )
}
