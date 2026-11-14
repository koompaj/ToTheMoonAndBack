// OWNER: dashboard + AI workstream.
// BASELINE STUB - lists table rows against the publications PSI lists for each investigation.
// To add: a fire-safety relevance score, the reuse network, and the AI-drafted research question.
// Always show the caveat: PSI's publication lists are not the full literature.
import type { AppData } from '../types/data'

export function UntappedPanel({ data }: { data: AppData }) {
  const rows = data.investigations
    .map((i) => {
      const tableRows = i.tables.reduce((n, t) => n + t.rows, 0)
      const pubs = i.publications.length
      return { i, tableRows, pubs, perPub: pubs > 0 ? tableRows / pubs : null }
    })
    .filter((r) => r.tableRows > 0)
    .sort((a, b) => (b.perPub ?? Infinity) - (a.perPub ?? Infinity))

  return (
    <section className="panel">
      <h2>Untapped data</h2>
      <table>
        <thead>
          <tr>
            <th>Investigation</th>
            <th>Table rows</th>
            <th>Publications listed</th>
            <th>Rows per publication</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ i, tableRows, pubs, perPub }) => (
            <tr key={i.accession}>
              <td>
                <a href={i.page} target="_blank" rel="noreferrer">
                  {i.acronym ?? i.accession}
                </a>
              </td>
              <td>{tableRows}</td>
              <td>{pubs}</td>
              <td>{perPub === null ? 'none listed' : perPub.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted">
        A signal, not proof: publication counts are only those listed in PSI, and newer releases have had less time to
        be studied.
      </p>
    </section>
  )
}
