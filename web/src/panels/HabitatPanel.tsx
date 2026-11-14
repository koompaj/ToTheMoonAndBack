// OWNER: dashboard + AI workstream.
// BASELINE STUB - counts the real tests inside the selected habitat box.
// To add: nearest evidence outside the box, "will it go out", untested conditions,
// and the cited AI summary.
import type { AppData, FuelClass } from '../types/data'
import { testsInHabitat, unplacedTests } from '../data/load'
import { useApp } from '../state/store'

const CLASSES: FuelClass[] = ['solid', 'droplet', 'gas']

export function HabitatPanel({ data }: { data: AppData }) {
  const { selectedHabitatId, selectHabitat } = useApp()
  const habitat = data.habitats.find((h) => h.id === selectedHabitatId) ?? null
  const inside = habitat ? testsInHabitat(data.tests, habitat) : []
  const byInvestigation = new Map<string, number>()
  inside.forEach((t) => byInvestigation.set(t.investigation, (byInvestigation.get(t.investigation) ?? 0) + 1))
  const unplaced = unplacedTests(data.tests)
  const noPressureSolid = unplaced.noPressureInTable.filter((t) => t.fuel_class === 'solid').length

  return (
    <section className="panel">
      <div className="tabs">
        {data.habitats.map((h) => (
          <button key={h.id} className={h.id === selectedHabitatId ? 'on' : ''} onClick={() => selectHabitat(h.id)}>
            {h.name}
          </button>
        ))}
      </div>
      {habitat && (
        <>
          <p className="muted">
            Oxygen {Math.round(habitat.o2_fraction[0] * 100)}-{Math.round(habitat.o2_fraction[1] * 100)} %, pressure{' '}
            {habitat.pressure_psi[0]}-{habitat.pressure_psi[1]} psi. Source: {habitat.source}.
          </p>
          <p className="big">{inside.length} tests inside</p>
          <ul>
            {CLASSES.map((c) => (
              <li key={c}>
                {c}: {inside.filter((t) => t.fuel_class === c).length}
              </li>
            ))}
          </ul>
          <ul>
            {[...byInvestigation].map(([acc, n]) => {
              const inv = data.investigations.find((i) => i.accession === acc)
              return (
                <li key={acc}>
                  <a href={inv?.page} target="_blank" rel="noreferrer">
                    {inv?.acronym ?? acc}
                  </a>{' '}
                  ({acc}): {n}
                  {inv?.doi ? `, DOI ${inv.doi}` : ''}
                </li>
              )
            })}
          </ul>
          <p className="muted">
            Counts only tests whose table records cabin-air oxygen and pressure. {unplaced.noPressureInTable.length}{' '}
            tests come from tables with no pressure column ({noPressureSolid} of them solid materials), so they cannot
            be placed yet
            {unplaced.pressureUnusable.length > 0
              ? `; ${unplaced.pressureUnusable.length} more ${unplaced.pressureUnusable.length === 1 ? 'has' : 'have'} an unusable pressure value`
              : ''}
            .
          </p>
        </>
      )}
    </section>
  )
}
