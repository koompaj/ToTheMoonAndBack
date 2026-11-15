// OWNER: dashboard + AI workstream.
// "Risk": what NASA's fire data still does not cover, in plain words. A fire is most dangerous where
// PSI's tables hold no tests, so this page lists the gaps: by place and fuel, the biggest ones, and where the
// data to close them may already exist (the relevance vs. study ranking). Every count is computed
// live; every statement that is not a count names its source.
import type { AppData, FuelClass, GapStatement } from '../types/data'
import type { AiContent } from '../ai/content'
import { testsInHabitat } from '../data/load'
import { fmtPct, headline, isPlaced } from '../ai/evidence'
import { UntappedPanel } from './UntappedPanel'
import { DoiCite, TestCite } from './Cite'
import { FUTURE_PLACES, placeName } from './places'
import { Sun } from './SpaceArt'
import { FUEL_SHORT, FuelDot, PanelHead, ViewHead, FuelIcon, PILLAR_LABEL } from './ui'

const FUELS: FuelClass[] = ['gas', 'droplet', 'solid']


/** Cites for one gap statement: its test rows (first 3) and investigation DOIs. */
function GapCites({ g, data }: { g: GapStatement; data: AppData }) {
  const tests = g.test_ids.slice(0, 3).map((id) => data.tests.find((t) => t.id === id)).filter((t) => t !== undefined)
  return (
    <>
      {tests.map((t) => (
        <TestCite key={t.id} test={t} />
      ))}
      {g.test_ids.length > 3 && <span className="muted small"> +{g.test_ids.length - 3} rows</span>}
      {g.investigations.map((a) => (
        <DoiCite key={a} inv={data.investigations.find((i) => i.accession === a)} />
      ))}
    </>
  )
}

export function RiskView({ data, ai }: { data: AppData; ai: AiContent }) {
  const h = headline(data)
  const solidTotal = data.tests.filter((t) => t.fuel_class === 'solid').length
  const solidPlaced = data.tests.filter((t) => t.fuel_class === 'solid' && isPlaced(t)).length
  const solidIn = (id: string) => {
    const hab = data.habitats.find((x) => x.id === id)
    return hab ? testsInHabitat(data.tests, hab).filter((t) => t.fuel_class === 'solid').length : 0
  }
  const future = FUTURE_PLACES.filter((f) => !data.habitats.some((x) => x.id === f.id))
  const sameRows = data.otherTables.filter((o) => o.acronym === 'SAME' || o.acronym === 'SAME-R').reduce((n, o) => n + o.rows.length, 0)

  const gaps: { title: string; plain: string; why: string; source: string }[] = [
    {
      title: 'Fabrics and plastics: little pressure data',
      plain: `${solidPlaced} of ${solidTotal} solid-material tests have a cabin pressure we can place, all at 1 atm (14.7 psi), from NASA\u2019s BASS-II report. The rest have none.`,
      why: `Habitats are built from these materials, and pressure changes how a fire behaves, so for most of them we cannot say how they burn in a habitat’s air. Of the ${solidPlaced} that can be placed, ${solidIn('iss')} ran in ISS / Earth air and ${solidIn('moon_base')} in Moon Base air.`,
      source: 'Counted from tests.json. BASS, BASS-II and SAFFIRE tables have no pressure column; the placed tests use NASA/TM-20210011385 p. 102 ("Ambient pressure was 1 atm")',
    },
    {
      title: 'No solid material in PSI\u2019s tables at Moon Base oxygen',
      plain: `The most oxygen any solid-material test reached is ${h.topSolid ? fmtPct(h.topSolid.o2_fraction!) : 'not recorded'}. A Moon Base is expected at 30 % or more.`,
      why: 'More oxygen makes materials much more flammable, so results at lower oxygen may underestimate the danger.',
      source: 'tests.json; Moon Base air and flammability from the challenge page',
    },
    {
      title: 'No partial gravity at all',
      plain: 'Every test in PSI\u2019s tables ran in microgravity. None ran at Moon or Mars gravity.',
      why: 'Fire behaves differently with some gravity than with none. The challenge page suggests microgravity and Earth-gravity results could bound it, but Earth-gravity results are not in these tables.',
      source: 'Challenge page: no partial-gravity combustion data in PSI yet; LUCI and FM2 may add some. Every test\u2019s investigation is a NASA "Microgravity Investigation" (PSI records)',
    },
    {
      title: 'No record of putting out a solid-material fire',
      plain: 'No solid-material table records an extinguishing agent or how a flame was stopped.',
      why: 'We know what puts out a fuel droplet (FLEX), but not a burning seat cover or cable.',
      source: 'tests.json; BASS lists an extinguishing-agent test among its objectives, results only in its reports',
    },
    {
      title: 'Smoke data only from heated materials',
      plain: `The ${sameRows} smoke tests (SAME, SAME-R) heat materials without an open flame; none measure smoke from a gas or droplet flame.`,
      why: 'A detector tuned only for one kind of smoke may miss or be slow on another kind of fire.',
      source: 'other_tables.json (SAME, SAME-R)',
    },
    ...(future.length === 0 ? [] : [{
      title: `${future.length} places have no NASA air numbers yet`,
      plain: `${future.map((f) => f.name).join(', ')}: we cannot place any test against them.`,
      why: 'Crews will live there, but without their oxygen and pressure we cannot say which fire data applies.',
      source: 'habitats.json lists only places with a sourced atmosphere',
    }]),
  ]

  return (
    <section className="view" aria-labelledby="risk-heading">
      <ViewHead
        art={<Sun size={180} />}
        eyebrow="Risk"
        title="What We Still Don’t Know About Fire"
        lead="The least is known where PSI’s tables hold no tests. This page shows those gaps: which places and fuels have no tests in the tables, the biggest missing pieces, and which existing data could help fill them. NASA may have tested more in work that is not in PSI."
      />

      <section className="panel" aria-labelledby="matrix-title">
        <PanelHead title="Gaps by Place and Fuel" />
        <h2 id="matrix-title" className="sr-only">
          Gaps by place and fuel
        </h2>
        <p className="lead small risk-intro">
          Each box counts the NASA tests that ran in that place&rsquo;s air with that fuel. <b className="t-gap">Coral</b> means PSI&rsquo;s tables hold no test
          there: that is a risk. Click a box to see what a fire there would look like.
        </p>
        <div className="table-wrap">
          <table className="risk-matrix">
            <thead>
              <tr>
                <th scope="col">Place</th>
                {FUELS.map((f) => (
                  <th key={f} scope="col">
                    <FuelIcon fuel={f} /> {FUEL_SHORT[f]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.habitats.map((hab) => {
                const inside = testsInHabitat(data.tests, hab)
                return (
                  <tr key={hab.id}>
                    <th scope="row">{placeName(hab.id, hab.name)}</th>
                    {FUELS.map((f) => {
                      const n = inside.filter((t) => t.fuel_class === f).length
                      return (
                        <td key={f}>
                          <a className={`risk-cell ${n === 0 ? 'risk-gap' : 'risk-ok'}`} href={`#fire?h=${hab.id}&fuel=${f}`}>
                            <b>{n}</b>
                            <span>{n === 0 ? 'Not in PSI\u2019s tables' : n === 1 ? 'test' : 'tests'}</span>
                          </a>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              {future.map((f) => (
                <tr key={f.id}>
                  <th scope="row">{f.name}</th>
                  <td colSpan={3}>
                    <span className="risk-cell risk-unknown">No NASA air numbers yet, so no test can be placed</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="gaps-title">
        <h2 id="gaps-title" className="section-title">
          The Biggest Gaps
        </h2>
        <div className="gap-grid">
          {gaps.map((g, i) => (
            <article key={g.title} className="gap-card">
              <span className="gap-n" aria-hidden>
                {i + 1}
              </span>
              <h3>{g.title}</h3>
              <p className="gap-plain">{g.plain}</p>
              <p className="gap-why">
                <b>Why it matters:</b> {g.why}
              </p>
              <p className="footnote">Source: {g.source}</p>
            </article>
          ))}
        </div>
      </section>

      {data.gaps && data.gaps.pillars.length > 0 && (
        <section aria-labelledby="needed-title">
          <h2 id="needed-title" className="section-title">
            Research Needed, by Fire-Safety Job
          </h2>
          <div className="needed-grid">
            {data.gaps.pillars.map((p) => (
              <article key={p.pillar} className={`panel needed task-${p.pillar}`}>
                <h3 className="sim-task-title">
                  <span className="task-dot" aria-hidden />
                  {PILLAR_LABEL[p.pillar]}
                </h3>
                <h4>In the tables</h4>
                <ul className="sim-lines">
                  {p.tested.map((g, i) => (
                    <li key={i}>
                      {g.text} <GapCites g={g} data={data} />
                    </li>
                  ))}
                </ul>
                <h4>Not in the tables</h4>
                <ul className="sim-lines">
                  {p.not_in_tables.map((g, i) => (
                    <li key={i} className="gap">
                      {g.text} <GapCites g={g} data={data} />
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <ul className="out-caveats">
            {data.gaps.caveats.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="rank-heading-wrap">
        <h2 id="rank-heading-wrap" className="section-title">
          Where the Answers Might Already Be
        </h2>
        <p className="lead small">
          Some NASA data is very relevant to crew fire safety but has been used in few papers. Studying it is the fastest way to close
          a gap. Dots further right are more relevant; higher up means more data per paper, so less studied.
        </p>
        <UntappedPanel data={data} ai={ai} embedded />
      </section>
    </section>
  )
}
