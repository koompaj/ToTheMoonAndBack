// OWNER: dashboard + AI workstream.
// Citation chips. Every number on screen points back to a NASA table row or an investigation DOI.
import type { AppData, Investigation, Test } from '../types/data'
import type { AiSentence } from '../ai/content'
import { useApp } from '../state/store'

function tableName(path: string) {
  const base = path.split('/').pop() ?? path
  return base.replace(/\.csv$/, '').replace(/^PSI-\d+_Experimental table_/, '')
}

/** One test row: "CFI-G · row 12". Click selects the test (the map highlights it). */
export function TestCite({ test }: { test: Test }) {
  const selectTest = useApp((s) => s.selectTest)
  const selected = useApp((s) => s.selectedTestId === test.id)
  return (
    <button
      type="button"
      className={`cite cite-test${selected ? ' on' : ''}`}
      title={`${test.investigation}, ${tableName(test.source_table)}, row ${test.source_row}${test.test_label ? `, NASA test ${test.test_label}` : ''}`}
      onClick={() => selectTest(selected ? null : test.id)}
    >
      {test.acronym} · row {test.source_row}
    </button>
  )
}

/** An investigation's DOI, which PSI asks every user of its data to cite. */
export function DoiCite({ inv }: { inv: Investigation | undefined }) {
  if (!inv) return null
  if (!inv.doi)
    return (
      <a className="cite" href={inv.page} target="_blank" rel="noreferrer">
        {inv.accession}
      </a>
    )
  return (
    <a className="cite" href={`https://doi.org/${inv.doi}`} target="_blank" rel="noreferrer" title={`${inv.title} (${inv.accession})`}>
      doi:{inv.doi}
    </a>
  )
}

/** Resolve the citation ids of a generated sentence: test ids or accessions. */
export function SentenceCites({ sentence, data }: { sentence: AiSentence; data: AppData }) {
  return (
    <>
      {sentence.cites.map((id) => {
        const inv = data.investigations.find((i) => i.accession === id)
        if (inv) return <DoiCite key={id} inv={inv} />
        const t = data.tests.find((x) => x.id === id)
        if (t) return <TestCite key={id} test={t} />
        return (
          <span key={id} className="cite cite-bad" title="This citation does not match any test or investigation">
            {id}
          </span>
        )
      })}
    </>
  )
}
