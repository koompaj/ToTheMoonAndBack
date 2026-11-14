// OWNER: dashboard + AI workstream.
// View and filter state in the URL hash (#experiments?id=PSI-25), so a filtered view can be shared,
// bookmarked and reopened in the demo. Every component that reads the same key stays in sync:
// writes fire a "hashparams" event that all readers listen to.
import { useEffect, useState } from 'react'

const EVENT = 'hashparams'

export function parseHash() {
  const raw = window.location.hash.replace(/^#/, '')
  const [view, query = ''] = raw.split('?')
  return { view, params: new URLSearchParams(query) }
}

/** Read and write one filter value in the hash without adding history entries or scrolling. */
export function useHashParam(key: string, fallback: string): [string, (v: string) => void] {
  const [value, setValue] = useState(() => parseHash().params.get(key) ?? fallback)
  useEffect(() => {
    const on = () => setValue(parseHash().params.get(key) ?? fallback)
    window.addEventListener('hashchange', on)
    window.addEventListener(EVENT, on)
    return () => {
      window.removeEventListener('hashchange', on)
      window.removeEventListener(EVENT, on)
    }
  }, [key, fallback])
  const set = (v: string) => {
    const { view, params } = parseHash()
    if (v === fallback) params.delete(key)
    else params.set(key, v)
    const q = params.toString()
    history.replaceState(null, '', `#${view}${q ? `?${q}` : ''}`)
    setValue(v)
    window.dispatchEvent(new Event(EVENT))
  }
  return [value, set]
}
