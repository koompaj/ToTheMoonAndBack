// OWNER: dashboard + AI workstream (app shell and layout).
// The flow: Home (summary of every place) -> #place?h=<habitat> (one place, choose a fuel)
// -> #fire?h=<habitat>&fuel=<fuel> (3D fire illustration, expected behaviour, three tasks, evidence map).
// The fire page draws workstream B's components through the two render props below; see
// docs/PLAN.md. Until B's FireModel3D and HabitatSimMap exist, the baseline Flame3D and
// HabitatMap3D stand in for them.
import { useEffect, useState } from 'react'
import type { AppData } from './types/data'
import type { FireModelProps } from './types/sim'
import { distinctTestCount, loadData } from './data/load'
import { loadAiContent, type AiContent } from './ai/content'
import { Flame3D } from './scene/Flame3D'
import { HomeView } from './panels/HomeView'
import { PlaceView } from './panels/PlaceView'
import { FireView } from './panels/FireView'
import { ExperimentsView } from './panels/ExperimentsView'
import { RiskView } from './panels/RiskView'
import { SimulationView } from './panels/SimulationView'
import { EarthDrawer } from './panels/EarthDrawer'
import { parseHash } from './panels/route'

const VIEWS = [
  { id: 'map', label: 'Home', nav: true },
  { id: 'place', label: 'Place', nav: false },
  { id: 'fire', label: 'Fire', nav: false },
  { id: 'experiments', label: 'Experiments', nav: true },
  { id: 'risk', label: 'Risk', nav: true },
  { id: 'simulation', label: 'Simulation', nav: true },
] as const
type ViewId = (typeof VIEWS)[number]['id']

// Old links from earlier versions of the app still land somewhere sensible.
const ALIASES: Record<string, string> = { compare: 'experiments', tests: 'experiments', investigations: 'experiments', untapped: 'risk', earth: 'map', quality: 'experiments' }

function viewFromHash(): ViewId {
  const raw = parseHash().view
  const v = ALIASES[raw] ?? raw
  return (VIEWS.find((x) => x.id === v)?.id ?? 'map') as ViewId
}

// ---- workstream B slot (swap this line when B's FireModel3D lands; see docs/PLAN.md) ----
const renderFire = (p: FireModelProps) => <Flame3D gravity={p.params.gravity} />

function Mark() {
  return (
    <svg className="mark" viewBox="0 0 32 32" aria-hidden>
      <defs>
        <radialGradient id="mk" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#f4f8ff" />
          <stop offset="0.45" stopColor="#6aa6ff" />
          <stop offset="1" stopColor="#2b5cff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="15" fill="url(#mk)" />
      <circle cx="16" cy="16" r="4.5" fill="#ffcc29" />
    </svg>
  )
}

export default function App() {
  const [data, setData] = useState<AppData | null>(null)
  const [ai, setAi] = useState<AiContent>({ habitats: null, investigations: null, fire: null })
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<ViewId>(viewFromHash)

  useEffect(() => {
    loadData().then(setData, (e) => setError(String(e)))
    loadAiContent().then(setAi)
  }, [])

  useEffect(() => {
    let last = viewFromHash()
    const on = () => {
      const next = viewFromHash()
      setView(next)
      if (next !== last) window.scrollTo(0, 0)
      last = next
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  if (error)
    return (
      <p className="status">
        Could not load the data ({error}). Run <code>python -I scripts/build_web_data.py data web/public/data</code>, then reload.
      </p>
    )
  if (!data) return <p className="status">Loading NASA PSI data…</p>

  const investigationsWithTests = new Set(data.tests.map((t) => t.investigation)).size
  const navOn = view === 'place' || view === 'fire' ? 'map' : view

  return (
    <div className="app">
      <a className="skip" href="#main">
        Skip to Content
      </a>
      <header className="topbar">
        <a className="brand" href="#map" aria-label="Flame in Freefall, home">
          <Mark />
          <span>Flame in Freefall</span>
        </a>
        <nav aria-label="Views">
          {VIEWS.filter((v) => v.nav).map((v) => (
            <a key={v.id} href={`#${v.id}`} className={navOn === v.id ? 'on' : ''} aria-current={view === v.id ? 'page' : undefined}>
              {v.label}
            </a>
          ))}
        </nav>
        <span className="topbar-meta mono">
          {distinctTestCount(data).toLocaleString('en')} tests · {investigationsWithTests}/{data.investigations.length} investigations
        </span>
      </header>

      <main id="main" tabIndex={-1}>
        {view === 'map' && <HomeView data={data} />}
        {view === 'place' && <PlaceView data={data} ai={ai} />}
        {view === 'fire' && <FireView data={data} ai={ai} renderFire={renderFire} />}
        {view === 'experiments' && <ExperimentsView data={data} ai={ai} />}
        {view === 'risk' && <RiskView data={data} ai={ai} />}
        {view === 'simulation' && <SimulationView data={data} />}
      </main>

      <EarthDrawer data={data} />

      <footer className="footer">
        <span>
          Data: NASA Physical Sciences Informatics (
          <a href="https://psi.nasa.gov/physci/repo/" target="_blank" rel="noreferrer">
            psi.nasa.gov
          </a>
          ). Each investigation is cited by its DOI.
        </span>
        <span>NASA Space Apps 2026 · Flame in Freefall · Team To The Moon And Back</span>
      </footer>
    </div>
  )
}
