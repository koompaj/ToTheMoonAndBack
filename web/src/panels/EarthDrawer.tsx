// OWNER: dashboard + AI workstream.
// "Earth benefits" as a floating Earth button that opens a side drawer with three sub-tabs, one per
// fire-safety pillar. Each sub-tab lists the NASA spinoffs that fit it and the experiments the
// challenge page places under that pillar; each experiment expands to NASA's own benefit text and
// links to its page. Spinoff texts paraphrase the challenge page's Resources tab.
import { useEffect, useRef, useState } from 'react'
import type { AppData, Pillar } from '../types/data'
import { shortName } from '../ai/evidence'
import { DoiCite } from './Cite'
import { Earth } from './SpaceArt'
import { Choice, PILLAR_HINT, PILLAR_LABEL } from './ui'
import { EdgeTab } from './EdgeTab'

const CHALLENGE = 'https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/?tab=resources'

// Grouped by pillar by us (stated on screen); texts paraphrase the challenge page.
const SPINOFFS: { pillar: Pillar; title: string; era: string; text: string; href: string }[] = [
  { pillar: 'detection', title: 'Smarter Smoke Detector', era: '1970s', text: 'Tells smoke from dust, so fewer false alarms.', href: 'https://spinoff.nasa.gov/node/9407' },
  { pillar: 'suppression', title: 'Water-Mist Extinguishers', era: 'ISS era', text: 'Made for the ISS, now useful on Earth.', href: CHALLENGE },
  { pillar: 'suppression', title: 'Firefighter Air Tanks', era: '1970s', text: 'Better breathing gear, from spacesuit tech.', href: 'https://spinoff.nasa.gov/node/9582' },
  { pillar: 'suppression', title: 'Firefighter Clothing', era: '1980s', text: 'Better protective suits, from spacesuit tech.', href: 'https://spinoff.nasa.gov/node/9918' },
]

function clip(t: string, n: number) {
  const s = t.replace(/\s+/g, ' ').trim()
  return s.length > n ? `${s.slice(0, n).replace(/\s+\S*$/, '')}…` : s
}

export function EarthDrawer({ data }: { data: AppData }) {
  const [open, setOpen] = useState(false)
  const [pillar, setPillar] = useState<Pillar>('prevention')
  const [expanded, setExpanded] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    panelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const close = () => {
    setOpen(false)
    buttonRef.current?.focus()
  }
  const exps = data.investigations.filter((i) => i.pillar === pillar)
  const count = (p: Pillar) => data.investigations.filter((i) => i.pillar === p).length

  return (
    <>
      <EdgeTab ref={buttonRef} icon={<Earth size={44} />} label="Earth Benefits" slot={0} tone="earth" open={open} onClick={() => setOpen(true)} />

      {open && (
        <div className="drawer-wrap">
          <button type="button" className="drawer-scrim" aria-label="Close Earth benefits" onClick={close} />
          <div ref={panelRef} className="drawer" role="dialog" aria-modal="true" aria-labelledby="earth-title" tabIndex={-1}>
            <header className="drawer-head">
              <Earth size={56} />
              <div>
                <h2 id="earth-title">Earth Benefits</h2>
                <p className="muted small">NASA&rsquo;s space fire research, helping people on Earth.</p>
              </div>
              <button type="button" className="icon-btn" onClick={close} aria-label="Close">
                ×
              </button>
            </header>

            <section className="drawer-section" aria-labelledby="spin-title">
              <h3 id="spin-title">Already Used on Earth</h3>
              <div className="spin-grid">
                {SPINOFFS.map((s) => (
                  <a key={s.title} className={`spin-card spin-${s.pillar}`} href={s.href} target="_blank" rel="noreferrer">
                    <span className="spin-top">
                      <span className="spin-dot" aria-hidden />
                      <span className="spinoff-era">{s.era}</span>
                    </span>
                    <b>{s.title}</b>
                    <span className="spin-text">{s.text}</span>
                    <span className="spin-tag">{PILLAR_LABEL[s.pillar]} ↗</span>
                  </a>
                ))}
              </div>
            </section>

            <h3 className="drawer-sub">Experiments by Job</h3>

            <Choice
              label="Fire-safety pillar"
              value={pillar}
              onChange={(p) => {
                setPillar(p)
                setExpanded(null)
              }}
              className="full"
              options={(['prevention', 'suppression', 'detection'] as Pillar[]).map((p) => ({
                id: p,
                tone: p,
                title: PILLAR_HINT[p],
                label: (
                  <>
                    {PILLAR_LABEL[p]} <span className="count">{count(p)}</span>
                  </>
                ),
              }))}
            />
            <p className={`drawer-hint t-${pillar}`}>{PILLAR_HINT[pillar]}</p>

            <section className="drawer-section">
              <h3>
                {PILLAR_LABEL[pillar]} Experiments on the Space Station <span className="count">{exps.length}</span>
              </h3>
              <ul className="drawer-list">
                {exps.map((inv) => {
                  const isOpen = expanded === inv.accession
                  const tests = data.tests.filter((t) => t.investigation === inv.accession).length
                  return (
                    <li key={inv.accession} className={isOpen ? 'open' : ''}>
                      <button type="button" className="drawer-item" aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? null : inv.accession)}>
                        <span className="drawer-item-name">{shortName(inv)}</span>
                        <span className="muted small">{inv.title}</span>
                        <span className="drawer-chev" aria-hidden>
                          {isOpen ? '–' : '+'}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="drawer-body">
                          <p>{inv.earth_benefits ? clip(inv.earth_benefits, 700) : 'NASA lists no benefit text for this experiment.'}</p>
                          <div className="drawer-actions">
                            <a className="btn btn-primary btn-quiet" href={`#experiments?id=${inv.accession}`} onClick={close}>
                              {tests ? `See Its ${tests} Tests →` : 'Open Experiment →'}
                            </a>
                            <DoiCite inv={inv} />
                          </div>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
              <p className="footnote">Groups follow the challenge page. Spinoff texts paraphrase its Resources tab.</p>
            </section>
          </div>
        </div>
      )}
    </>
  )
}
