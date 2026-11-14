// OWNER: dashboard + AI workstream.
// Reads the summaries written offline by ai/generate.mjs (web/public/ai/*.json).
// The browser never calls a model and never sees an API key. If the files are absent the app
// simply shows no AI text; everything else is computed from NASA's tables.

/** One sentence of generated text and the evidence it rests on. */
export interface AiSentence {
  text: string
  /** Test ids (tests.json) and/or investigation accessions (investigations.json). */
  cites: string[]
}

export interface AiFile<T> {
  generated_at: string
  model: string
  /** Set to true by a person after reading every sentence against its sources. */
  reviewed: boolean
  reviewed_by: string | null
  items: Record<string, T>
}

export interface AiHabitat {
  summary: AiSentence[]
}

export interface AiInvestigation {
  summary: AiSentence[]
  research_question: AiSentence | null
}

/** Suggestions for one place and fuel (key "habitat:fuel"), shown as "AI suggestion, draft". Like all
 *  AI text, every sentence cites test rows or accessions, and any number must come from the fact pack;
 *  ai/generate.mjs rejects anything else. */
export interface AiFireTasks {
  detection: AiSentence[]
  suppression: AiSentence[]
  prevention: AiSentence[]
}

export interface AiContent {
  habitats: AiFile<AiHabitat> | null
  investigations: AiFile<AiInvestigation> | null
  fire: AiFile<AiFireTasks> | null
}

async function optional<T>(name: string): Promise<T | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}ai/${name}`)
    if (!res.ok) return null
    const type = res.headers.get('content-type') ?? ''
    if (!type.includes('json')) return null // dev servers answer a missing file with index.html
    return (await res.json()) as T
  } catch {
    return null
  }
}

export async function loadAiContent(): Promise<AiContent> {
  const [habitats, investigations, fire] = await Promise.all([
    optional<AiFile<AiHabitat>>('habitats.json'),
    optional<AiFile<AiInvestigation>>('investigations.json'),
    optional<AiFile<AiFireTasks>>('fire.json'),
  ])
  return { habitats, investigations, fire }
}
