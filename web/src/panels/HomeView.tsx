// OWNER: dashboard + AI workstream.
// Step 1 of the flow: a wide summary across every place crews live. Every number is computed
// live from the generated NASA data. Each card and chart leads somewhere: a place card opens that
// place (step 2), a fuel slice opens the Test Explorer filtered to it, a pillar opens Investigations.
import type { AppData, FuelClass } from '../types/data'
import { distinctTestCount, testsInHabitat, testsInHabitatAndGravity } from '../data/load'
import { fmtPct, headline, isDuplicate, isPlaced, pressureSources, pressureSourcesText, psi } from '../ai/evidence'
import { Donut, Histogram, StackRow, type BarSeg } from './charts'
import { FUTURE_PLACES, PARTIAL_G_NOTE, gravityShort, placeArt, placeName } from './places'
import { PlaceArt, RocketPath, Stars } from './SpaceArt'
import { UploadPanel } from './UploadPanel'
import { useHashParam } from './route'
import { FUEL_SHORT, PanelHead, PILLAR_LABEL } from './ui'

const FUELS: FuelClass[] = ['solid', 'droplet', 'gas']
const go = (hash: string) => {
  window.location.hash = hash
}

function segs(tests: { fuel_class: FuelClass }[]): BarSeg[] {
  return FUELS.map((f) => ({
    key: f,
    value: tests.filter((t) => t.fuel_class === f).length,
    className: `fill-${f}`,
    label: FUEL_SHORT[f],
  }))
}

export function HomeView({ data }: { data: AppData }) {
  const [tab, setTab] = useHashParam('tab', 'places')
  const h = headline(data)
  const nTests = distinctTestCount(data)
  const distinct = data.tests.filter((t) => !isDuplicate(t))
  const solidSrc = pressureSourcesText(pressureSources(data.tests.filter((t) => t.fuel_class === 'solid')))
  const places = data.habitats.map((hab) => ({
    hab,
    inside: testsInHabitat(data.tests, hab),
    sameG: testsInHabitatAndGravity(data.tests, hab).length,
  }))
  const future = FUTURE_PLACES.filter((f) => !data.habitats.some((x) => x.id === f.id))
  const maxInside = Math.max(1, ...places.map((p) => p.inside.length))
  const amb = data.tests.filter((t) => t.o2_basis === 'ambient' && t.o2_fraction !== null)

  // oxygen histogram of cabin-air tests (2-point bins, 10-42 %)
  const bins = Array.from({ length: 16 }, (_, i) => ({
    x0: 0.1 + i * 0.02,
    x1: 0.12 + i * 0.02,
    values: {} as Record<string, number>,
  }))
  for (const t of amb) {
    const i = Math.floor((t.o2_fraction! - 0.1) / 0.02)
    if (i >= 0 && i < bins.length) bins[i].values[t.fuel_class] = (bins[i].values[t.fuel_class] ?? 0) + 1
  }
  const outcomes = Object.entries(
    data.tests.reduce<Record<string, number>>((m, t) => (t.outcome ? ((m[t.outcome] = (m[t.outcome] ?? 0) + 1), m) : m), {}),
  ).sort((a, b) => b[1] - a[1])
  const maxOut = Math.max(1, ...outcomes.map((o) => o[1]))
  const pillars = (['prevention', 'detection', 'suppression'] as const).map((p) => ({ p, n: data.investigations.filter((i) => i.pillar === p).length }))
  const unstated = data.investigations.filter((i) => !i.pillar).length

  return (
    <div className="home">
      <section className="headline" aria-labelledby="home-title">
        <PanelHead title="Mission Briefing" />
        <div className="headline-stage">
          <Stars />
          <div className="headline-text">
            <h1 id="home-title">
              <span className="headline-pre">What does NASA know about fire</span>
              <span className="headline-big">Where Crews Live?</span>
            </h1>
            <p className="headline-body">
              {nTests.toLocaleString('en')} NASA microgravity combustion tests, placed by the <b>oxygen</b> and <b>pressure</b> they ran at, against the air in
              each place crews live. Pick a place to see what is known there, then a fuel to see how a fire would behave and how to detect, stop and prevent it.
            </p>
          </div>
          <div className="headline-art">
            <RocketPath className="rocket" />
            <PlaceArt kind="moon" size={300} className="moon" />
          </div>
        </div>
        <dl className="stat-strip">
          <div>
            <dt>NASA tests</dt>
            <dd>{nTests.toLocaleString('en')}</dd>
          </div>
          <div>
            <dt>Investigations</dt>
            <dd>{data.investigations.length}</dd>
          </div>
          <div>
            <dt>Placed on the map</dt>
            <dd>{h.placed.toLocaleString('en')}</dd>
          </div>
          <div>
            <dt>Places with NASA numbers</dt>
            <dd>{data.habitats.length}</dd>
          </div>
        </dl>
      </section>

      <section className="folder" aria-label="Places and uploads">
        <div className="folder-tabs" role="tablist" aria-label="Places or upload">
          <button
            type="button"
            role="tab"
            id="tab-places"
            aria-controls="panel-places"
            aria-selected={tab !== 'upload'}
            className="folder-tab"
            onClick={() => setTab('places')}
          >
            <h2 id="places-title">Choose a Place</h2>
          </button>
          <button
            type="button"
            role="tab"
            id="tab-upload"
            aria-controls="panel-upload"
            aria-selected={tab === 'upload'}
            className="folder-tab folder-tab-upload"
            onClick={() => setTab('upload')}
          >
            <span aria-hidden>＋</span> Upload New Experiment
          </button>
        </div>
        <div className="folder-body">
          {tab === 'upload' ? (
            <div role="tabpanel" id="panel-upload" aria-labelledby="tab-upload">
              <UploadPanel habitats={data.habitats} />
            </div>
          ) : (
            <div role="tabpanel" id="panel-places" aria-labelledby="tab-places">
              <p className="lead small">{PARTIAL_G_NOTE} The counts below match air only; each card says whether its gravity matches too.</p>
              <div className="place-grid">
                {places.map(({ hab, inside, sameG }, i) => (
                  <button key={hab.id} type="button" className="place-card" onClick={() => go(`#place?h=${hab.id}`)}>
                    <span className="place-art">
                      <PlaceArt kind={placeArt(hab.id)} size={110} />
                    </span>
                    <span className="place-name">{placeName(hab.id, hab.name)}</span>
                    <span className="place-cond mono">
                      {hab.o2_fraction[0] === hab.o2_fraction[1]
                        ? fmtPct(hab.o2_fraction[0], 0)
                        : `${fmtPct(hab.o2_fraction[0], 0)} – ${fmtPct(hab.o2_fraction[1], 0)}`}{' '}
                      oxygen ·{' '}
                      {hab.pressure_psi[0] === hab.pressure_psi[1] ? `${hab.pressure_psi[0]} psi` : `${hab.pressure_psi[0]} – ${hab.pressure_psi[1]} psi`}
                    </span>
                    <span className="place-num">{inside.length}</span>
                    <span className="place-sub">NASA tests in this air</span>
                    {gravityShort(hab, inside.length, sameG) && <span className="place-grav">{gravityShort(hab, inside.length, sameG)}</span>}
                    <span className="mini-bar">
                      {inside.length === 0 ? (
                        <span className="mini-empty" />
                      ) : (
                        segs(inside)
                          .filter((s) => s.value)
                          .map((s) => (
                            <i
                              key={s.key}
                              className={`${s.className} grow-x`}
                              style={{
                                flexGrow: s.value,
                                animationDelay: `${i * 120}ms`,
                              }}
                            />
                          ))
                      )}
                    </span>
                    <span className="place-go">Explore →</span>
                  </button>
                ))}
                {future.map((f) => (
                  <div key={f.id} className="place-card future" aria-label={`${f.name}: waiting for a NASA source`}>
                    <span className="place-art">
                      <PlaceArt kind={placeArt(f.id)} size={110} />
                    </span>
                    <span className="place-name">{f.name}</span>
                    <span className="place-cond">{f.why}</span>
                    <span className="badge warn">Waiting for a NASA Source</span>
                  </div>
                ))}
              </div>
              {data.waitingPlaces && data.waitingPlaces.length > 0 && (
                <div className="waiting">
                  <h3>Places We Can&rsquo;t Show Yet</h3>
                  <ul>
                    {data.waitingPlaces.map((w) => (
                      <li key={w.id}>
                        <b>{w.name}.</b> {w.why} <span className="muted">{w.what_would_change}</span>{' '}
                        {w.source_urls.map((u, i) => (
                          <a key={u} className="cite" href={u} target="_blank" rel="noreferrer">
                            source {w.source_urls.length > 1 ? i + 1 : ''}
                          </a>
                        ))}
                      </li>
                    ))}
                  </ul>
                  <a className="link" href="#experiments?preset=custom">
                    Try your own values →
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="chart-grid" aria-label="Summary charts">
        <div className="panel chart-card wide">
          <h2>Tests in Each Place, by Fuel</h2>
          <p className="muted small">How many tests in PSI's tables ran in each place's air. Click a row to open that place.</p>
          <div className="srows">
            {places.map(({ hab, inside }, i) => (
              <StackRow
                key={hab.id}
                label={placeName(hab.id, hab.name)}
                sub={`${inside.filter((t) => t.fuel_class === 'solid').length} solid`}
                segs={segs(inside)}
                max={maxInside}
                delay={i * 120}
                onClick={() => go(`#place?h=${hab.id}`)}
                empty="No test in PSI's tables"
              />
            ))}
          </div>
          <div className="legend-row">
            {FUELS.map((f) => (
              <span key={f}>
                <i className={`swatch fill-${f}`} />
                {FUEL_SHORT[f]}
              </span>
            ))}
          </div>
        </div>

        <div className="panel chart-card">
          <h2>What Burned</h2>
          <p className="muted small">All {nTests.toLocaleString('en')} distinct tests by fuel. Click to list them.</p>
          <Donut
            parts={FUELS.map((f) => ({
              key: f,
              value: distinct.filter((t) => t.fuel_class === f).length,
              className: `fill-${f}`,
              label: FUEL_SHORT[f],
            }))}
            centre={nTests.toLocaleString('en')}
            sub="tests"
            onPick={(f) => go(`#experiments?view=tests&fuel=${f}`)}
          />
          <p className="chart-note">
            <b className="t-gap">{data.tests.filter((t) => t.fuel_class === 'solid' && isPlaced(t)).length}</b> of {h.solidTotal} solid tests can be placed.{' '}
            {solidSrc && <>Their pressure is from NASA documents, not the tables: {solidSrc}. </>}The other solid tests have none.
          </p>
        </div>

        <div className="panel chart-card wide">
          <h2>Where NASA Tested: Cabin Oxygen</h2>
          <p className="muted small">Cabin-air tests by oxygen level. The gold band is Moon Base oxygen (30 % or more); pressure is not shown here.</p>
          <Histogram
            bins={bins}
            series={FUELS.map((f) => ({
              key: f,
              className: `fill-${f}`,
              label: `${f} tests`,
            }))}
            bands={[
              {
                from: 0.3,
                to: 0.42,
                className: 'band-moon',
                label: 'Moon Base oxygen',
              },
            ]}
            xLabel="cabin oxygen"
            format={(x) => `${Math.round(x * 100)}%`}
          />
          <p className="chart-note">
            Highest solid-material test: <b className="t-solid">{h.topSolid ? fmtPct(h.topSolid.o2_fraction!) : '–'}</b>. Highest pressure placed:{' '}
            {psi(Math.max(...data.tests.filter(isPlaced).map((t) => t.pressure_atm!))).toFixed(0)} psi.
          </p>
        </div>

        <div className="panel chart-card">
          <h2>How Tests Ended</h2>
          <p className="muted small">Endings as NASA's tables record them.</p>
          <div className="srows">
            {outcomes.map(([o, n], i) => (
              <StackRow
                key={o}
                label={<span className="cap">{o}</span>}
                segs={[
                  {
                    key: o,
                    value: n,
                    className: o === 'completion' ? 'fill-gap' : o === 'disruption' || o === 'flow terminated' ? 'fill-muted' : 'fill-evidence',
                    label: o,
                  },
                ]}
                max={maxOut}
                delay={i * 100}
                onClick={() => go(`#experiments?view=tests&q=${encodeURIComponent(o)}`)}
              />
            ))}
          </div>
          <p className="chart-note">Green = the flame went out; coral = it burned to the end.</p>
        </div>

        <div className="panel chart-card full">
          <h2>Fire-Safety Pillars</h2>
          <p className="muted small">Investigations the challenge page places under each pillar.</p>
          <div className="srows">
            {pillars.map(({ p, n }, i) => (
              <StackRow
                key={p}
                label={PILLAR_LABEL[p]}
                segs={[{ key: p, value: n, className: `fill-${p}`, label: p }]}
                max={Math.max(...pillars.map((x) => x.n), unstated)}
                delay={i * 100}
                onClick={() => go(`#experiments?pillar=${p}`)}
              />
            ))}
            <StackRow
              label="Not stated"
              segs={[
                {
                  key: 'none',
                  value: unstated,
                  className: 'fill-muted',
                  label: 'not stated',
                },
              ]}
              max={Math.max(...pillars.map((x) => x.n), unstated)}
              delay={300}
              onClick={() => go('#experiments?pillar=unstated')}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
