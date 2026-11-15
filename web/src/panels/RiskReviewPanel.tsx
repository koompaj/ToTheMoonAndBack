// OWNER: dashboard + AI workstream.
// The AI risk review of user uploads: a short summary right after submitting, and the full review
// on the Risk page. Every AI line shows the facts it cites (NASA test rows, investigations, the
// upload's own rows, the automatic checks). Reviews not yet read are highlighted in blue as "Updated".
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { AppData } from '../types/data'
import { DoiCite, TestCite, UserMark } from './Cite'
import { checks, helperUp, loadReviews, onLaptop, markSeen, onReviewsChanged, requestReview, type Fact, type StoredReview } from './riskReview'
import type { UserUpload } from './uploads'
import { PanelHead } from './ui'

type State = 'idle' | 'loading' | 'error' | 'offline'
let seenTimer: ReturnType<typeof setTimeout> | undefined

export function useReview(upload: UserUpload, data: AppData, auto = true) {
  const [stored, setStored] = useState<StoredReview | null>(() => loadReviews()[upload.id] ?? null)
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState('')
  useEffect(() => onReviewsChanged(() => setStored(loadReviews()[upload.id] ?? null)), [upload.id])
  const run = useCallback(async () => {
    setState('loading')
    setError('')
    if (!(await helperUp())) return setState('offline')
    try {
      setStored(await requestReview(upload, data))
      setState('idle')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setState('error')
    }
  }, [upload, data])
  useEffect(() => {
    if (auto && !loadReviews()[upload.id]) run()
    // only when the upload changes; run() itself is stable per upload
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upload.id, auto])
  return { stored, state, error, run }
}

function Chip({ id, facts, data }: { id: string; facts: Fact[]; data: AppData }) {
  const f = facts.find((x) => x.id === id)
  if (!f) return null
  if (f.kind === 'nasa-test') {
    const t = data.tests.find((x) => x.id === f.ref)
    if (t) return <TestCite test={t} />
  }
  if (f.kind === 'investigation') {
    const inv = data.investigations.find((x) => x.accession === f.ref)
    if (inv) return <DoiCite inv={inv} />
  }
  return (
    <span className={`cite ai-cite ai-cite-${f.kind}`} title={f.text}>
      {f.label}
    </span>
  )
}

/** Citation chips: the first two, then "+N" to show the rest. */
function Cites({ ids, facts, data, limit = 2 }: { ids: string[]; facts: Fact[]; data: AppData; limit?: number }) {
  const [all, setAll] = useState(false)
  const shown = all ? ids : ids.slice(0, limit)
  return (
    <span className="ai-cites">
      {shown.map((id) => (
        <Chip key={id} id={id} facts={facts} data={data} />
      ))}
      {ids.length > limit && (
        <button type="button" className="ai-more" onClick={() => setAll(!all)} aria-expanded={all}>
          {all ? 'less' : `+${ids.length - limit}`}
        </button>
      )}
    </span>
  )
}

function Status({ state, error, run }: { state: State; error: string; run: () => void }) {
  if (state === 'loading') return <p className="ai-status ai-loading">AI is reviewing this upload against NASA&rsquo;s tables. This can take up to a minute.</p>
  if (state === 'offline')
    return (
      <p className="ai-status ai-warn">
        {onLaptop() ? (
          <>
            The AI helper isn&rsquo;t running, so no review yet. Start it with <code>node ai/risk-server.mjs</code>, then{' '}
          </>
        ) : (
          <>The AI review isn&rsquo;t available on this site right now. </>
        )}
        <button type="button" className="link-btn" onClick={run}>
          try again
        </button>
        .
      </p>
    )
  if (state === 'error')
    return (
      <p className="ai-status ai-warn">
        The AI could not write a review ({error}).{' '}
        <button type="button" className="link-btn" onClick={run}>
          Try again
        </button>
      </p>
    )
  return null
}

function AiNote({ s }: { s: StoredReview }) {
  // Short label on screen; the details (provider, model, time, dropped lines) stay in the tooltip.
  const detail = `Written by AI (${s.provider}, ${s.model}) on ${new Date(s.generated_at).toLocaleString()} using only the facts it was given. Each line shows what it cites; check them before relying on it.${s.review.dropped > 0 ? ` ${s.review.dropped} line${s.review.dropped > 1 ? 's were' : ' was'} left out for citing nothing real.` : ''}`
  return (
    <p className="ai-note" title={detail}>
      AI-suggestions
    </p>
  )
}

/** Shown right after submitting: the summary and the top risks. */
export function ReviewSummary({ upload, data }: { upload: UserUpload; data: AppData }) {
  const { stored, state, error, run } = useReview(upload, data)
  return (
    <section className="ai-summary" aria-live="polite">
      <h4 className="ai-summary-title">AI Risk Summary</h4>
      <Status state={state} error={error} run={run} />
      {stored && (
        <>
          {stored.review.summary && (
            <p className="ai-new ai-lead">
              {stored.review.summary.text} <Cites ids={stored.review.summary.cites} facts={stored.facts} data={data} />
            </p>
          )}
          {stored.review.risks.length > 0 && (
            <ul className="ai-top">
              {stored.review.risks.slice(0, 3).map((l, i) => (
                <li key={i}>{l.text}</li>
              ))}
            </ul>
          )}
          <AiNote s={stored} />
          <a className="link" href="#risk">
            See the full review on the Risk page →
          </a>
        </>
      )}
    </section>
  )
}

type SectionKey = 'risks' | 'missing' | 'problems' | 'compare' | 'next'
const ICON: Record<SectionKey, ReactNode> = {
  risks: <path d="M12 3c1.6 2.6 4.5 4.4 4.5 8.2a4.5 4.5 0 0 1-9 0c0-1.7.8-3 1.8-4 .2 1.5.9 2.4 1.7 2.4.4-2.4-.3-4.4 1-6.6z" />,
  missing: (
    <>
      <circle cx="10.5" cy="10.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M15 15l5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  problems: (
    <>
      <path d="M12 3.5 21 19.5H3z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 9.5v4.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="12" cy="16.8" r="1.2" />
    </>
  ),
  compare: (
    <>
      <path d="M12 4v16M5 7h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 7l-3 6h6zM19 7l-3 6h6z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </>
  ),
  next: (
    <>
      <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M7.5 15h9" stroke="currentColor" strokeWidth="2" />
    </>
  ),
}
const SECTIONS: { key: SectionKey; title: string; tone: string }[] = [
  { key: 'risks', title: 'Safety Risks', tone: 'risk' },
  { key: 'missing', title: 'Data Missing', tone: 'missing' },
  { key: 'problems', title: 'Data Problems', tone: 'problem' },
  { key: 'compare', title: 'Vs NASA', tone: 'compare' },
  { key: 'next', title: 'Next Tests', tone: 'next' },
]
const Icon = ({ k }: { k: SectionKey }) => (
  <svg className="ai-ico" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
    {ICON[k]}
  </svg>
)
const Sparkle = ({ size = 16 }: { size?: number }) => (
  <svg className="ai-sparkle" viewBox="0 0 24 24" width={size} height={size} aria-hidden>
    <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z" fill="currentColor" />
    <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" fill="currentColor" opacity=".7" />
  </svg>
)

/** The review itself: summary, a colour tab per section, the lines of the open tab. */
function ReviewBody({ upload, data, stored, fresh }: { upload: UserUpload; data: AppData; stored: StoredReview | null; fresh: boolean }) {
  const [tab, setTab] = useState<SectionKey>('risks')
  const auto = checks(upload, data)
  if (!stored) return null
  const r = stored.review
  const count = (k: SectionKey) => r[k].length + (k === 'problems' ? auto.length : 0)
  // Open the chosen tab, or the first one with something in it.
  const active = count(tab) > 0 ? tab : (SECTIONS.find((s) => count(s.key) > 0)?.key ?? tab)
  const open = SECTIONS.find((s) => s.key === active)!
  return (
    <>
      {r.summary && (
        <p className={`ai-lead${fresh ? ' ai-new' : ''}`}>
          <Sparkle /> {r.summary.text} <Cites ids={r.summary.cites} facts={stored.facts} data={data} />
        </p>
      )}
      <div className="ai-tabs" role="tablist" aria-label="Review sections">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            role="tab"
            aria-selected={active === s.key}
            className={`ai-tab ai-t-${s.tone}`}
            title={s.title}
            onClick={() => setTab(s.key)}
            disabled={count(s.key) === 0}
          >
            <Icon k={s.key} />
            <span>{s.title}</span>
            <b className="ai-count">{count(s.key)}</b>
          </button>
        ))}
      </div>
      <div className={`ai-pane ai-t-${open.tone}`} role="tabpanel" aria-label={open.title}>
        <ul className="ai-lines scroll-astro">
          {r[active].map((l, i) => (
            <li key={i} className={fresh ? 'ai-line ai-new' : 'ai-line'}>
              <span className="ai-line-text">{l.text}</span> <Cites ids={l.cites} facts={stored.facts} data={data} />
            </li>
          ))}
          {active === 'problems' &&
            auto.map((c) => (
              <li key={c.id} className="ai-line ai-check">
                <span className="ai-check-tag">{c.id.replace('CK', 'Check ')}</span> <span className="ai-line-text">{c.text}</span>
              </li>
            ))}
        </ul>
      </div>
    </>
  )
}

const Orbit = () => (
  <svg className="ai-orbit" viewBox="0 0 200 120" aria-hidden>
    <ellipse cx="140" cy="40" rx="70" ry="22" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 5" />
    <circle cx="140" cy="40" r="13" fill="url(#aiPlanet)" />
    <circle cx="74" cy="48" r="3" fill="#ffe39a" />
    <circle cx="190" cy="20" r="1.6" fill="#fff" />
    <circle cx="100" cy="12" r="1.2" fill="#fff" />
    <defs>
      <radialGradient id="aiPlanet" cx="35%" cy="30%">
        <stop offset="0" stopColor="#dbeefe" />
        <stop offset="1" stopColor="#3b82f6" />
      </radialGradient>
    </defs>
  </svg>
)

/** The newest upload: the blue "featured" card. */
function FeaturedCard({ upload, data }: { upload: UserUpload; data: AppData }) {
  const { stored, state, error, run } = useReview(upload, data)
  const fresh = !!stored && !stored.seen
  const inv = upload.investigation
  return (
    <article className={`ai-card ai-featured${fresh ? ' ai-card-new' : ''}`}>
      <Orbit />
      <header className="ai-card-head">
        <span className="ai-avatar" aria-hidden>
          <Sparkle size={20} />
        </span>
        <div className="ai-card-title">
          <span className="ai-kicker">Latest upload</span>
          <h3>
            {inv.acronym} <span>· {inv.title}</span>
          </h3>
          <p>
            <span className="ai-meta">{inv.flight_platform ?? 'No place chosen'}</span>
            <span className="ai-meta">{upload.tests.length} tests</span>
            <UserMark />
          </p>
        </div>
        {fresh && <span className="ai-badge">Updated</span>}
      </header>
      <Status state={state} error={error} run={run} />
      <ReviewBody upload={upload} data={data} stored={stored} fresh={fresh} />
      <footer className="ai-card-foot">
        {stored && <AiNote s={stored} />}
        <a className="link" href={`#experiments?id=${inv.accession}`}>
          Open the upload →
        </a>
      </footer>
    </article>
  )
}

/** An older upload: one line, opens to the same review (not blue). */
function OlderRow({ upload, data }: { upload: UserUpload; data: AppData }) {
  const { stored, state, error, run } = useReview(upload, data)
  const inv = upload.investigation
  const n = stored ? stored.review.risks.length : 0
  return (
    <details className="ai-old">
      <summary>
        <span className="ai-old-name">{inv.acronym}</span>
        <span className="ai-meta">{inv.flight_platform ?? 'No place chosen'}</span>
        <span className="ai-meta">{upload.tests.length} tests</span>
        {stored && <span className="ai-old-risk">{n} {n === 1 ? 'risk' : 'risks'}</span>}
        <span className="ai-old-date">{new Date(upload.submitted_at).toLocaleDateString()}</span>
      </summary>
      <div className="ai-old-body">
        <Status state={state} error={error} run={run} />
        <ReviewBody upload={upload} data={data} stored={stored} fresh={false} />
        <a className="link" href={`#experiments?id=${inv.accession}`}>
          Open the upload →
        </a>
      </div>
    </details>
  )
}

/** Risk page section: the newest upload in the blue spot, older ones folded below. */
export function RiskReviewSection({ uploads, data }: { uploads: UserUpload[]; data: AppData }) {
  const [reviews, setReviews] = useState(loadReviews)
  useEffect(() => onReviewsChanged(() => setReviews(loadReviews())), [])
  // Leaving the Risk page counts as reading the updates. The short delay keeps React's dev-mode
  // double mount from marking them read the moment the page opens.
  useEffect(() => {
    clearTimeout(seenTimer)
    return () => {
      const ids = uploads.map((u) => u.id)
      seenTimer = setTimeout(() => markSeen(ids), 300)
    }
  }, [uploads])
  if (!uploads.length) return null
  const newestFirst = [...uploads].reverse()
  const [latest, ...older] = newestFirst
  const unseen = uploads.filter((u) => reviews[u.id] && !reviews[u.id].seen)
  return (
    <section className="ai-section" aria-labelledby="ai-review-title">
      <PanelHead title="Your Uploads · AI Risk Review">
        {unseen.length > 0 && (
          <button type="button" className="btn btn-quiet ai-mark" onClick={() => markSeen(unseen.map((u) => u.id))}>
            Mark as read
          </button>
        )}
      </PanelHead>
      <h2 id="ai-review-title" className="sr-only">
        Your uploads: AI risk review
      </h2>
      <FeaturedCard key={latest.id} upload={latest} data={data} />
      {older.length > 0 && (
        <div className="ai-older">
          <h4>Earlier uploads</h4>
          {older.map((u) => (
            <OlderRow key={u.id} upload={u} data={data} />
          ))}
        </div>
      )}
    </section>
  )
}
