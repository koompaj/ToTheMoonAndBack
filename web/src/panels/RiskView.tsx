// OWNER: dashboard + AI workstream.
// "Risk": what NASA's fire data still does not cover, in plain words. A fire is most dangerous where
// nobody has tested, so this page lists the gaps: by place and fuel, the biggest ones, and where the
// data to close them may already exist (the relevance vs. study ranking). Every count is computed
// live; every statement that is not a count names its source.
import type { AppData, FuelClass } from '../types/data'
import type { AiContent } from '../ai/content'
import { testsInHabitat } from '../data/load'
import { fmtPct, headline, isPlaced } from '../ai/evidence'
import { UntappedPanel } from './UntappedPanel'
import { FUTURE_PLACES, placeName } from './places'
import { Sun } from './SpaceArt'
import { FUEL_SHORT, FuelDot, PanelHead, ViewHead } from './ui'

const FUELS: FuelClass[] = ['gas', 'droplet', 'solid']

export function RiskView({ data, ai }: { data: AppData; ai: AiContent }) {
  const h = headline(data)
  const solidTotal = data.tests.filter((t) => t.fuel_class === 'solid').length
  const solidPlaced = data.tests.filter((t) => t.fuel_class === 'solid' && isPlaced(t)).length
  const future = FUTURE_PLACES.filter((f) => !data.habitats.some((x) => x.id === f.id))
  const sameRows = data.otherTables.filter((o) => o.acronym === 'SAME' || o.acronym === 'SAME-R').reduce((n, o) => n + o.rows.length, 0)

  const gaps: { title: string; plain: string; why: string; source: string }[] = [
    {
      title: 'Fabrics and plastics have no pressure data',
      plain: `${solidPlaced} of ${solidTotal} solid-material tests record the cabin pressure they ran at.`,
      why: 'Habitats are built from these materials, and pressure changes how a fire behaves, so we cannot say how they burn in any habitat’s air.',
      source: 'Counted from tests.json (BASS, BASS-II, SAFFIRE tables have no pressure column)',
    },
    {
      title: 'No solid material tested in Moon Base oxygen',
      plain: `The most oxygen any solid-material test reached is ${h.topSolid ? fmtPct(h.topSolid.o2_fraction!) : 'not recorded'}. A Moon Base is expected at 30 % or more.`,
      why: 'More oxygen makes materials much more flammable, so results at lower oxygen may underestimate the danger.',
      source: 'tests.json; Moon Base air and flammability from the challenge page',
    },
    {
      title: 'No partial gravity at all',
      plain: 'Every test is either in microgravity or on Earth. Nothing at Moon or Mars gravity.',
      why: 'Fire behaves differently with some gravity than with none; for now the Moon can only be guessed between the two.',
      source: 'Challenge page: no partial-gravity combustion data in PSI yet',
    },
    {
      title: 'No record of putting out a solid-material fire',
      plain: 'No solid-material table records an extinguishing agent or how a flame was stopped.',
      why: 'We know what puts out a fuel droplet (FLEX), but not a burning seat cover or cable.',
      source: 'tests.json; BASS lists an extinguishing-agent test among its objectives, results only in its reports',
    },
    {
      title: 'Smoke data only from heated materials',
      plain: `The ${sameRows} smoke tests (SAME, SAME-R) heat solid materials; none measure smoke from a gas or droplet flame.`,
      why: 'A detector tuned only for one kind of smoke may miss or be slow on another kind of fire.',
      source: 'other_tables.json (SAME, SAME-R)',
    },
    {
      title: `${future.length} places have no NASA air numbers yet`,
      plain: `${future.map((f) => f.name).join(', ')}: we cannot place any test against them.`,
      why: 'Crews will live there, but without their oxygen and pressure we cannot say which fire data applies.',
      source: 'habitats.json lists only places with a sourced atmosphere',
    },
  ]

  return (
    <section className="view" aria-labelledby="risk-heading">
      <ViewHead
        art={<Sun size={180} />}
        eyebrow="Risk"
        title="What We Still Don’t Know About Fire"
        lead="A fire is most dangerous where nobody has tested it. This page shows the gaps in NASA’s fire data: which places and fuels have no tests, the biggest missing pieces, and which existing data could help fill them."
      />

      <section className="panel" aria-labelledby="matrix-title">
        <PanelHead title="Gaps by Place and Fuel" />
        <h2 id="matrix-title" className="sr-only">
          Gaps by place and fuel
        </h2>
        <p className="lead small risk-intro">
          Each box counts the NASA tests that ran in that place&rsquo;s air with that fuel. <b className="t-gap">Coral</b> means nobody has tested it:
          that is a risk. Click a box to see what a fire there would look like.
        </p>
        <div className="table-wrap">
          <table className="risk-matrix">
            <thead>
              <tr>
                <th scope="col">Place</th>
                {FUELS.map((f) => (
                  <th key={f} scope="col">
                    <FuelDot fuel={f} /> {FUEL_SHORT[f]}
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
                            <span>{n === 0 ? 'Not tested' : n === 1 ? 'test' : 'tests'}</span>
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
