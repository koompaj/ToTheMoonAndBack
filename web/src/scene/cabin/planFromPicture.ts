// OWNER: 3D workstream. What the Simulation stage does with a layout that an AI model drew from
// the user's picture. The page asks for the drawing (panels/sim/planToLayout.ts) and hands the
// stage the finished file, marked "drawn_by_ai", exactly as it hands over an uploaded file.
//
// THE DRAWING IS THE MODEL'S READING OF THE USER'S PICTURE. It is not NASA data and it can be
// wrong. The model never says what anything is made of: the user picks each object's fuel in the
// stage, from the fuels NASA's tables cover.

/** What a file drawn by AI says about itself. Shown as the model's words, never as fact. */
export interface AiDrawingInfo {
  model: string
  /** The model's own sentence about the scale it used. */
  scaleNote: string | null
  /** The file as the page handed it over. */
  text: string
}

/** Reads the marks the page puts on a file drawn by AI; null for any other layout file. */
export function aiDrawingInfo(text: string): AiDrawingInfo | null {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return null
  }
  if (typeof raw !== 'object' || raw === null || (raw as { drawn_by_ai?: unknown }).drawn_by_ai !== true) return null
  const { ai_model, scale_note } = raw as { ai_model?: unknown; scale_note?: unknown }
  return {
    model: typeof ai_model === 'string' && ai_model.trim() ? ai_model.trim().slice(0, 60) : 'An AI model',
    scaleNote: typeof scale_note === 'string' && scale_note.trim() ? scale_note.trim().slice(0, 240) : null,
    text,
  }
}

/** The model's layout as a file the user can keep, fix by hand and upload again, with the fuels
 *  they chose written in. It is no longer marked as a draft: uploaded again, it is checked as
 *  the user's own layout file. */
export function layoutFileText(text: string, fuels: Readonly<Record<string, string>>) {
  const { drawn_by_ai: _mark, ...layout } = JSON.parse(text) as { drawn_by_ai?: unknown; items?: { id?: unknown }[] }
  const items = (layout.items ?? []).map((item) => (typeof item.id === 'string' && fuels[item.id] ? { ...item, fuel: fuels[item.id] } : item))
  return JSON.stringify({ ...layout, note: 'Drawn by an AI model from a picture, then edited by the user. Not a NASA design.', items }, null, 2)
}
