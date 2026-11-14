// OWNER: dashboard + AI workstream (app shell and layout).
import { useEffect, useState } from 'react'
import type { AppData } from './types/data'
import { loadData } from './data/load'
import { useApp } from './state/store'
import { HabitatMap3D } from './scene/HabitatMap3D'
import { Flame3D } from './scene/Flame3D'
import { HabitatPanel } from './panels/HabitatPanel'
import { UntappedPanel } from './panels/UntappedPanel'

export default function App() {
  const [data, setData] = useState<AppData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { showBurnerOxidizer, setShowBurnerOxidizer } = useApp()
  const [gravity, setGravity] = useState(0)

  useEffect(() => {
    loadData().then(setData, (e) => setError(String(e)))
  }, [])

  if (error) return <p className="status">Could not load the data: {error}</p>
  if (!data) return <p className="status">Loading NASA PSI data...</p>

  return (
    <div className="app">
      <header>
        <h1>Flame in Freefall</h1>
        <span className="muted">
          {data.tests.length} real NASA tests from {new Set(data.tests.map((t) => t.investigation)).size} of the{' '}
          {data.investigations.length} PSI combustion investigations
        </span>
        <label>
          <input type="checkbox" checked={showBurnerOxidizer} onChange={(e) => setShowBurnerOxidizer(e.target.checked)} />
          show inverse flames (oxygen is burner gas, not cabin air)
        </label>
      </header>
      <main>
        <HabitatMap3D data={data} />
        <aside>
          <HabitatPanel data={data} />
          <section className="panel">
            <h2>Flame shape</h2>
            <Flame3D gravity={gravity} />
            <label className="slider">
              microgravity
              <input type="range" min={0} max={1} step={0.01} value={gravity} onChange={(e) => setGravity(Number(e.target.value))} />
              Earth gravity
            </label>
          </section>
          <UntappedPanel data={data} />
        </aside>
      </main>
    </div>
  )
}
