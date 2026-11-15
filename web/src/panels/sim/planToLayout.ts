// Asks the AI helper (this site's /api/plan-to-layout on Vercel, or ai/risk-server.mjs on a laptop)
// to describe a picture of a floor plan as a 3D layout
// file, for the "Draw this plan in 3D with AI" button on the Simulation page. Added by the 3D
// workstream; it lives here because the button is on the page, and the page hands the 3D stage
// the finished file exactly as it hands it an uploaded one.
//
// WHAT COMES BACK IS AN AI MODEL'S READING OF THE USER'S PICTURE. It is not NASA data, it holds
// none, and it can be wrong. Three things keep it honest:
//   - the picture is sent (to Google Gemini, through the helper) only when the user presses the
//     button; the API key stays in the helper's .env and never reaches the browser;
//   - anything the model says about what an object is made of is thrown away here. The user picks
//     each object's fuel in the 3D view, from the fuels NASA's tables cover;
//   - the file is marked "drawn_by_ai", and the 3D stage checks it like any layout file
//     (scene/cabin/layoutFile.ts) and refuses it whole if anything is wrong.
import { findHelper } from '../riskReview'

/** Longest side of the picture as sent: enough to read a plan, and no more of it than needed. */
const MAX_SIDE = 1600

/** True when an AI helper (this site or the laptop) is reachable and has a key for this job. */
export async function helperCanDraw(): Promise<boolean> {
  return (await findHelper())?.simulation === true
}

/** The picture as a JPEG no larger than MAX_SIDE, in base64. */
async function shrink(blob: Blob): Promise<string> {
  const bitmap = await createImageBitmap(blob)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff' // a see-through PNG would otherwise turn black
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const jpeg = await new Promise<Blob | null>((done) => canvas.toBlob(done, 'image/jpeg', 0.88))
  if (!jpeg) throw new Error('the picture could not be prepared')
  const dataUrl = await new Promise<string>((done, fail) => {
    const reader = new FileReader()
    reader.onload = () => done(String(reader.result))
    reader.onerror = () => fail(new Error('the picture could not be read'))
    reader.readAsDataURL(jpeg)
  })
  return dataUrl.slice(dataUrl.indexOf(',') + 1)
}

/** Sends the picture and returns the model's answer as the text of a layout file, marked as
 *  drawn by AI and with every material removed. Not yet checked: the 3D stage does that.
 *  Throws with the helper's message if it fails. */
export async function askForLayout(pictureUrl: string): Promise<string> {
  const image = await shrink(await (await fetch(pictureUrl)).blob())
  const helper = await findHelper()
  if (!helper?.simulation) throw new Error('the AI helper is not reachable')
  const res = await fetch(`${helper.base}/api/plan-to-layout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ image, mime: 'image/jpeg' }),
    signal: AbortSignal.timeout(150_000),
  })
  const json = (await res.json().catch(() => ({}))) as { layout?: unknown; model?: unknown; error?: unknown }
  if (!res.ok) throw new Error(typeof json.error === 'string' ? json.error : `the helper answered ${res.status}`)
  if (typeof json.layout !== 'object' || json.layout === null || Array.isArray(json.layout)) throw new Error('the helper did not return a layout')
  const layout = json.layout as Record<string, unknown>
  // The model was told not to name materials. If it did anyway, they are dropped: a material
  // read off a floor plan would be a guess.
  const items = Array.isArray(layout.items)
    ? layout.items.map((item) => {
        if (typeof item !== 'object' || item === null) return item
        const { fuel: _fuel, material: _material, ...rest } = item as Record<string, unknown>
        return rest
      })
    : []
  return JSON.stringify(
    {
      ...layout,
      format: 'flame-in-freefall-layout', // the layout-file format the 3D stage reads
      drawn_by_ai: true,
      ai_model: typeof json.model === 'string' ? json.model : 'Gemini',
      items,
    },
    null,
    2,
  )
}
