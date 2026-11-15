// OWNER: dashboard + AI workstream.
// "Upload New Experiment": the user fills in the experiment, attaches a CSV of its tests, checks the
// preview, and submits. A space-themed warning asks them to confirm, because an upload cannot be
// edited afterwards. Saved in this browser only (uploads.ts); every upload is marked as user-uploaded.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { FuelClass, Habitat, Pillar } from '../types/data'
import { placeName } from './places'
import { buildUpload, CSV_TEMPLATE, isValidSource, parseTestsCsv, saveUpload, type RowResult, type UploadForm, type UserUpload } from './uploads'
import { Stars } from './SpaceArt'
import { Choice, FUEL_LABEL, FuelIcon, PanelHead, PILLAR_LABEL } from './ui'

const EMPTY: UploadForm = { acronym: '', title: '', organisation: '', platform: '', fuel_class: 'solid', pillar: '', source: '', description: '' }

function Field({ label, hint, children, wide }: { label: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`up-field${wide ? ' wide' : ''}`}>
      <span className="up-label">{label}</span>
      {children}
      {hint && <span className="up-hint">{hint}</span>}
    </label>
  )
}

function downloadTemplate() {
  const url = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'experiment-tests-template.csv'
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** The space-themed "are you sure?" dialog. Escape or the back button closes it. */
function ConfirmDialog({ form, rows, fileName, onCancel, onConfirm }: { form: UploadForm; rows: RowResult[]; fileName: string; onCancel: () => void; onConfirm: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
    return () => d?.close()
  }, [])
  return (
    <dialog ref={ref} className="up-dialog" aria-labelledby="up-confirm-title" onCancel={(e) => (e.preventDefault(), onCancel())}>
      <div className="up-dialog-card">
        <Stars />
        <div className="up-dialog-body">
          <PanelHead title="Upload · Final Check" />
          <header className="up-dialog-head">
            <h2 id="up-confirm-title">Check Your Experiment</h2>
            <p className="muted small">Review the details below before submitting.</p>
          </header>
          <p className="up-dialog-warn">
            <span className="up-warn-circle" aria-hidden>
              !
            </span>
            <span>
              <b>Check before you submit.</b> It can&rsquo;t be edited afterwards.
            </span>
          </p>
          <dl className="up-summary">
            <div>
              <dt>Experiment</dt>
              <dd>
                {form.acronym} · {form.title}
              </dd>
            </div>
            <div>
              <dt>From</dt>
              <dd>{form.organisation}</dd>
            </div>
            <div>
              <dt>Place</dt>
              <dd>{form.platform}</dd>
            </div>
            <div>
              <dt>Fuel</dt>
              <dd>{FUEL_LABEL[form.fuel_class]}</dd>
            </div>
            <div>
              <dt>Tests</dt>
              <dd>
                {rows.length} {rows.length === 1 ? 'row' : 'rows'} from {fileName}
              </dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd className="up-break">{form.source}</dd>
            </div>
          </dl>
          <div className="up-dialog-actions">
            <button type="button" className="btn" onClick={onCancel} autoFocus>
              Go Back
            </button>
            <button type="button" className="btn btn-primary" onClick={onConfirm}>
              Submit Experiment
            </button>
          </div>
        </div>
      </div>
    </dialog>
  )
}

export function UploadPanel({ habitats }: { habitats: Habitat[] }) {
  const [form, setForm] = useState<UploadForm>(EMPTY)
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState<ReturnType<typeof parseTestsCsv> | null>(null)
  const [tried, setTried] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [done, setDone] = useState<UserUpload | null>(null)
  const [saveError, setSaveError] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const set = <K extends keyof UploadForm>(k: K, v: UploadForm[K]) => setForm((f) => ({ ...f, [k]: v }))

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setFileName(file.name)
    if (file.size > 2_000_000) {
      setParsed({ header: [], rows: [], fileError: 'The file is over 2 MB. Split it into smaller uploads.' })
      return
    }
    setParsed(parseTestsCsv(await file.text()))
  }

  const rowErrors = parsed?.rows.filter((r) => r.errors.length) ?? []
  const problems: Record<string, string> = {}
  if (!form.acronym.trim()) problems.acronym = 'Give the experiment a short name.'
  if (!form.title.trim()) problems.title = 'Give the full title.'
  if (!form.organisation.trim()) problems.organisation = 'Say who ran it.'
  if (!form.platform) problems.platform = 'Choose the place it was tested for.'
  if (!isValidSource(form.source)) problems.source = 'Add a DOI (10.xxxx/…) or a link starting with https://'
  if (!parsed) problems.file = 'Attach the tests file (CSV).'
  else if (parsed.fileError) problems.file = parsed.fileError
  else if (rowErrors.length) problems.file = `Fix ${rowErrors.length} row${rowErrors.length > 1 ? 's' : ''} with problems first (listed below).`
  const ok = Object.keys(problems).length === 0
  const err = (k: string) => (tried && problems[k] ? <span className="up-error">{problems[k]}</span> : null)

  const submit = () => {
    if (!parsed) return
    const u = buildUpload(form, parsed.rows, fileName)
    if (saveUpload(u)) {
      setDone(u)
      setForm(EMPTY)
      setParsed(null)
      setFileName('')
      setTried(false)
      if (fileRef.current) fileRef.current.value = ''
    } else setSaveError(true)
    setConfirming(false)
  }

  if (done)
    return (
      <div className="up-done">
        <span className="up-done-badge">✓</span>
        <h3>{done.investigation.acronym} Has Landed</h3>
        <p>
          {done.tests.length} tests were added and marked <span className="user-mark">✦ User-uploaded</span>. They now count on the place cards and in Experiments.
        </p>
        <div className="up-dialog-actions">
          <a className="btn btn-primary" href={`#experiments?id=${done.investigation.accession}`}>
            Open the Experiment →
          </a>
          <button type="button" className="btn" onClick={() => setDone(null)}>
            Upload Another
          </button>
        </div>
      </div>
    )

  return (
    <form
      className="up-form"
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        setTried(true)
        setSaveError(false)
        if (ok) setConfirming(true)
      }}
    >
      <p className="up-intro">
        Add an experiment that isn&rsquo;t in NASA&rsquo;s PSI tables. It is saved in this browser only and marked{' '}
        <span className="user-mark">✦ User-uploaded</span> wherever it appears.
      </p>

      <fieldset className="up-group">
        <legend>1 · The Experiment</legend>
        <div className="up-grid">
          <Field label="Short name *" hint="e.g. FLARE-2">
            <input name="acronym" autoComplete="off" maxLength={40} value={form.acronym} onChange={(e) => set('acronym', e.target.value)} aria-invalid={tried && !!problems.acronym} />
            {err('acronym')}
          </Field>
          <Field label="Full title *" wide>
            <input name="title" autoComplete="off" maxLength={200} value={form.title} onChange={(e) => set('title', e.target.value)} aria-invalid={tried && !!problems.title} />
            {err('title')}
          </Field>
          <Field label="Organisation *" hint="Who ran it">
            <input name="organisation" autoComplete="organization" maxLength={120} value={form.organisation} onChange={(e) => set('organisation', e.target.value)} aria-invalid={tried && !!problems.organisation} />
            {err('organisation')}
          </Field>
          <Field label="Place it was tested for *" hint="Whose air its tests match">
            <select name="platform" value={form.platform} onChange={(e) => set('platform', e.target.value)} aria-invalid={tried && !!problems.platform}>
              <option value="">Choose a place…</option>
              {habitats.map((h) => (
                <option key={h.id} value={placeName(h.id, h.name)}>
                  {placeName(h.id, h.name)}
                </option>
              ))}
            </select>
            {err('platform')}
          </Field>
          <Field label="Source: DOI or link *" hint="So others can check it" wide>
            <input name="source" autoComplete="off" inputMode="url" spellCheck={false} maxLength={300} placeholder="10.1234/abcd or https://…" value={form.source} onChange={(e) => set('source', e.target.value)} aria-invalid={tried && !!problems.source} />
            {err('source')}
          </Field>
        </div>
        <div className="up-row">
          <div className="up-field">
            <span className="up-label">Fuel type *</span>
            <Choice
              label="Fuel type"
              value={form.fuel_class}
              onChange={(v: FuelClass) => set('fuel_class', v)}
              options={(['solid', 'droplet', 'gas'] as FuelClass[]).map((f) => ({
                id: f,
                label: (
                  <>
                    <FuelIcon fuel={f} size={18} /> {FUEL_LABEL[f]}
                  </>
                ),
              }))}
            />
          </div>
          <div className="up-field">
            <span className="up-label">Fire-safety job</span>
            <Choice
              label="Fire-safety job"
              value={form.pillar || 'none'}
              onChange={(v: string) => set('pillar', v === 'none' ? '' : (v as Pillar))}
              options={[...(['prevention', 'detection', 'suppression'] as Pillar[]).map((p) => ({ id: p, label: PILLAR_LABEL[p] })), { id: 'none', label: 'Not stated' }]}
            />
          </div>
        </div>
        <Field label="What it studied" wide>
          <textarea name="description" rows={3} maxLength={2000} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
      </fieldset>

      <fieldset className="up-group">
        <legend>2 · Its Tests</legend>
        <p className="up-hint">
          One row per test. Columns: <code>test_label, fuel, oxygen_percent, pressure_psi, gravity_g, outcome</code>. Oxygen and pressure are needed to place a
          test on the place cards; extra columns are kept as written.{' '}
          <button type="button" className="link-btn" onClick={downloadTemplate}>
            Download the template
          </button>
        </p>
        <label className={`up-drop${fileName ? ' has-file' : ''}`}>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0])} />
          <span className="up-drop-icon" aria-hidden>
            ⬆
          </span>
          <span>{fileName ? <b>{fileName}</b> : <>Choose a CSV file, or drop it here</>}</span>
        </label>
        {err('file')}
        {parsed && !parsed.fileError && (
          <div className="up-preview">
            <p className="small">
              <b>{parsed.rows.length}</b> tests read{rowErrors.length ? <>, <b className="t-gap">{rowErrors.length}</b> with problems</> : ', all fine'}.
            </p>
            <div className="up-table-wrap scroll-astro">
              <table>
                <thead>
                  <tr>
                    <th>Line</th>
                    {parsed.header.map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                    <th>Check</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, 200).map((r) => (
                    <tr key={r.line} className={r.errors.length ? 'bad' : ''}>
                      <td className="mono">{r.line}</td>
                      {parsed.header.map((h) => (
                        <td key={h}>{r.values[h]}</td>
                      ))}
                      <td>{r.errors.length ? r.errors.join('; ') : '✓'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsed.rows.length > 200 && <p className="muted small">Showing the first 200 rows.</p>}
          </div>
        )}
      </fieldset>

      {saveError && <p className="up-error">This browser would not save the upload (private window or storage full). Nothing was added.</p>}
      <div className="up-submit">
        <p className="up-submit-note">
          {tried && !ok ? (
            <span className="up-error">Some fields need a look. They are marked in red above.</span>
          ) : (
            <>You&rsquo;ll see a summary to check before anything is saved. After that it can&rsquo;t be edited.</>
          )}
        </p>
        <button type="submit" className="up-submit-btn">
          Review and Submit
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
            <path d="M14.5 3.5c3 0 5.5 1 6 1.5.5.5 1.5 3 1.5 6-2 3-5 5.5-8 7l-4.5-4.5c1.5-3 4-6 7-8z" fill="currentColor" opacity="0.9" />
            <circle cx="16.2" cy="8" r="1.7" fill="#ff7a1a" />
            <path d="M8.5 15.5 5 19m4.5-1L7 20.5M6 14l-2.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {confirming && parsed && <ConfirmDialog form={form} rows={parsed.rows} fileName={fileName} onCancel={() => setConfirming(false)} onConfirm={submit} />}
    </form>
  )
}
