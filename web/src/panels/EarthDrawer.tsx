// OWNER: dashboard + AI workstream.
// "Earth Benefits": a right-edge side tab that opens a drawer of NASA fire-safety spinoffs used on
// Earth. Texts paraphrase the challenge page's Resources tab; each card links the NASA page.
// (Experiments by pillar were removed by team decision: the Experiments page already covers them.)
import { useEffect, useRef, useState } from 'react'
import type { AppData, Pillar } from '../types/data'
import { Earth } from './SpaceArt'
import { PILLAR_LABEL } from './ui'
import { EdgeTab } from './EdgeTab'

const CHALLENGE = 'https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/?tab=resources'

const SPINOFFS: { pillar: Pillar; title: string; era: string; text: string; href: string }[] = [
  { pillar: 'detection', title: 'Smarter Smoke Detector', era: '1970s', text: 'Built for the Space Shuttle. Tells smoke from dust, so fewer false alarms; used in industry, for example in mines.', href: 'https://spinoff.nasa.gov/node/9407' },
  { pillar: 'suppression', title: 'Water-Mist Extinguishers', era: 'ISS era', text: 'Fine-water-mist extinguishers made for the ISS, now useful on Earth.', href: CHALLENGE },
  { pillar: 'suppression', title: 'Firefighter Air Tanks', era: '1970s', text: 'Better air tanks and breathing gear for firefighters, from spacesuit tech.', href: 'https://spinoff.nasa.gov/node/9582' },
  { pillar: 'suppression', title: 'Firefighter Clothing', era: '1980s', text: 'Better protective clothing for firefighters, from spacesuit tech.', href: 'https://spinoff.nasa.gov/node/9918' },
]

export function EarthDrawer(_props: { data: AppData }) {
  const [open, setOpen] = useState(false)
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

  return (
    <>
      <EdgeTab ref={buttonRef} icon={<Earth size={44} />} label="Earth Benefits" slot={0} tone="earth" open={open} onClick={() => setOpen(true)} />

      {open && (
        <div className="drawer-wrap">
          <button type="button" className="drawer-scrim" aria-label="Close Earth benefits" onClick={close} />
          <div ref={panelRef} className="drawer drawer-earth" role="dialog" aria-modal="true" aria-labelledby="earth-title" tabIndex={-1}>
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

            <section className="spin-stack" aria-label="Already used on Earth">
              {SPINOFFS.map((s) => (
                <a key={s.title} className={`spin-card spin-${s.pillar}`} href={s.href} target="_blank" rel="noreferrer">
                  <span className="spin-top">
                    <span className="spin-dot" aria-hidden />
                    <span className="spinoff-era">{s.era}</span>
                    <span className="spin-tag">{PILLAR_LABEL[s.pillar]}</span>
                  </span>
                  <b>{s.title}</b>
                  <span className="spin-text">{s.text}</span>
                  <span className="spin-link">Read the NASA page ↗</span>
                </a>
              ))}
            </section>
            <p className="footnote">Texts paraphrase the challenge page&rsquo;s Resources tab.</p>
          </div>
        </div>
      )}
    </>
  )
}
