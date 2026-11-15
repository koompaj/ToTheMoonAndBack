// OWNER: 3D workstream. The settings that let the cabin's conditions change the illustrated
// spread. Plain HTML, drawn over the canvas.
//
// EVERY ONE OF THESE IS THE USER'S ASSUMPTION, NOT NASA DATA, and each starts at "no effect"
// (CLAUDE.md, "Spread is an illustration, never a result"). NASA's tables hold no spread rates, so
// nothing here can be sourced. The strength of each effect is the user's; the SHAPE of each rule
// is our own, written out beside its slider below, and is not physics, a model or a NASA finding.
import { AIRFLOW_FULL_CMS, EARTH_AIR_O2, MIN_FACTOR, PACE_LIMITS, RULE_FLOOR, biasFrom, type CabinConditions, type EffectSettings } from './timeline'

const pct = (v: number) => `${Math.round(v * 100)} %`

/** Items per step in words, to the nearest half: two decimals would read like a measured rate,
 *  and this is only how the drawing is paced. */
function aboutPerStep(pace: number) {
  const half = Math.round(pace * 2) / 2
  if (half === 0) return 'fewer than 0.5 items per step'
  return `about ${half} ${half === 1 ? 'item' : 'items'} per step`
}

interface Row {
  key: keyof EffectSettings
  name: string
  max: number
  /** The rule, in plain words, for a strength of x. `air` says which way the air moves. */
  rule: (x: string, air: string) => string
  /** What it comes to with the conditions set right now. */
  now: (settings: EffectSettings, c: CabinConditions) => string
}

const ROWS: Row[] = [
  {
    key: 'airflow',
    name: 'Airflow effect',
    max: 0.8,
    rule: (x, air) =>
      `With the airflow at ${AIRFLOW_FULL_CMS} cm/s, anything straight downstream of the fire counts as ${x} nearer and anything straight upstream as ${x} farther; less airflow, less effect. ${air}`,
    now: (s, c) => (c.airflowCmS <= 0 ? 'Airflow is 0 cm/s, so there is nothing for this to act on.' : `At ${c.airflowCmS} cm/s: ${pct(biasFrom(s, c).downstream)} nearer downstream.`),
  },
  {
    key: 'gravity',
    name: 'Gravity effect',
    max: 0.8,
    rule: (x) => `At Earth gravity, anything straight above the fire counts as ${x} nearer and anything below as ${x} farther; less gravity, less effect.`,
    now: (s, c) => (c.gravity <= 0 ? 'Gravity is zero, so there is nothing for this to act on.' : `At ${pct(c.gravity)} of Earth gravity: ${pct(biasFrom(s, c).up)} nearer above.`),
  },
  {
    key: 'oxygen',
    name: 'Oxygen effect',
    max: 1,
    rule: (x) => `More items light per step as oxygen rises above ${pct(EARTH_AIR_O2)}, fewer below. At 100 % the number per step follows the oxygen in proportion; you have it at ${x}.`,
    now: (s, c) => `At ${(c.o2Fraction * 100).toFixed(1)} % oxygen: ${aboutPerStep(biasFrom({ ...s, pressure: 0 }, c).pace)} from this setting.`,
  },
  {
    key: 'pressure',
    name: 'Pressure effect',
    max: 1,
    rule: (x) => `More items light per step as pressure rises above 14.7 psi, fewer below. At 100 % the number per step follows the pressure in proportion; you have it at ${x}.`,
    now: (s, c) => `At ${(c.pressureAtm * 14.696).toFixed(1)} psi: ${aboutPerStep(biasFrom({ ...s, oxygen: 0 }, c).pace)} from this setting.`,
  },
]

/** Which way the air moves in the sample spacecraft, as written beside the airflow setting. */
const SAMPLE_AIR = 'In this example layout the air moves along the craft toward the node.'

export function SpreadSettings({ settings, conditions, onChange, air = SAMPLE_AIR }: { settings: EffectSettings; conditions: CabinConditions; onChange: (s: EffectSettings) => void; air?: string }) {
  const active = ROWS.filter((r) => settings[r.key] > 0).length
  return (
    <details className="cabin-b-settings">
      <summary>
        Spread settings <span>{active === 0 ? 'all at no effect' : `${active} in use`}</span>
      </summary>
      <p className="cabin-b-assume">Your assumptions, not NASA data. NASA&rsquo;s tables hold no spread rates. Each rule below is our own wording of a simple effect; only its strength is yours to set.</p>
      <p className="cabin-b-limits">
        <b>Fixed limits of this drawing (ours, not NASA data, and not yours to set):</b> however strong a setting, a distance never counts as less than {pct(MIN_FACTOR)} of itself; the oxygen rule and
        the pressure rule each give at least {RULE_FLOOR} of the usual one item per step; and the items per step stay between {PACE_LIMITS[0]} and {PACE_LIMITS[1]}.
      </p>
      {ROWS.map((r) => {
        const v = settings[r.key]
        return (
          <div key={r.key} className="cabin-b-effect">
            <label>
              <span>{r.name}</span>
              <b>{v === 0 ? 'no effect' : pct(v)}</b>
              <input type="range" min={0} max={r.max} step={0.05} value={v} onChange={(e) => onChange({ ...settings, [r.key]: Number(e.target.value) })} aria-label={`${r.name}, your assumption`} />
            </label>
            <small>{r.rule(pct(v), air)}</small>
            {v > 0 && <small className="cabin-b-now">{r.now(settings, conditions)}</small>}
          </div>
        )
      })}
      {active > 0 && (
        <button type="button" className="cabin-b-btn" onClick={() => onChange({ airflow: 0, gravity: 0, oxygen: 0, pressure: 0 })}>
          Set all to no effect
        </button>
      )}
    </details>
  )
}
