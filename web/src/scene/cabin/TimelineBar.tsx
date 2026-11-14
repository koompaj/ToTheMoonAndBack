// OWNER: 3D workstream. The controls under the cabin for the illustrated spread: play or pause,
// playback rate, and a bar to drag to any step.
//
// It counts STEPS, never seconds, and the rate is how fast the animation plays, not how fast a
// fire moves. The label below must stay on screen whenever spread is shown (CLAUDE.md, "Spread is
// an illustration, never a result"). Plain HTML, drawn over the canvas.
import { stepReached } from './timeline'

/** The wording is fixed by CLAUDE.md. Do not shorten it. */
export const SPREAD_LABEL = "Illustration of spread, not a prediction. NASA's tables do not model how fire spreads."

const RATES = [1, 2, 4]

export function TimelineBar({
  t,
  steps,
  playing,
  rate,
  onPlay,
  onRate,
  onScrub,
  field = false,
}: {
  t: number
  steps: number
  playing: boolean
  rate: number
  onPlay: () => void
  onRate: (rate: number) => void
  onScrub: (t: number) => void
  /** True when the coloured reach slices are on, so the key for their colours is shown. */
  field?: boolean
}) {
  const step = stepReached(t, steps)
  const atEnd = t >= steps
  return (
    <div className="cabin-b-timeline">
      <div className="cabin-b-timeline-row">
        <button type="button" className="cabin-b-btn" onClick={onPlay} aria-label={playing ? 'Pause' : atEnd ? 'Play again from the start' : 'Play'}>
          {playing ? '❚❚' : atEnd ? '↺' : '▶'}
        </button>
        <button
          type="button"
          className="cabin-b-btn"
          onClick={() => onRate(RATES[(RATES.indexOf(rate) + 1) % RATES.length])}
          aria-label={`Playback rate ${rate} times. Press to change.`}
          title="How fast the animation plays. Not a fire speed."
        >
          Playback {rate}×
        </button>
        <input
          type="range"
          min={0}
          max={steps}
          step={0.01}
          value={t}
          onChange={(e) => onScrub(Number(e.target.value))}
          aria-label="Timeline, in steps"
          aria-valuetext={`Step ${step} of ${steps}`}
        />
        <span className="cabin-b-step">
          Step {step} of {steps}
        </span>
      </div>
      {field && (
        <div className="cabin-b-key" aria-label="Colour key: red is where the fire starts, blue is the edge the drawing has reached">
          <span>fire starts</span>
          <i />
          <span>edge reached so far</span>
          <small>Colour is distance from the start in this drawing. It is not heat, smoke or air speed.</small>
        </div>
      )}
      <p className="cabin-b-timeline-note">
        <b>{SPREAD_LABEL}</b> Items light one per step, nearest first, by distance in this example layout only. A step is not a length of time.
      </p>
    </div>
  )
}
