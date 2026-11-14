// SHARED - which listed place a pair of oxygen and pressure values belongs to. Owned by the data
// workstream; added by workstream B, with A's agreement, for the Simulation page's conditions panel.
//
// Evidence is worked out per place (fuels.json, inside_by_habitat), so values the user sets by
// hand change the evidence only by changing which place they fall in. Nothing here widens a
// place's range: values are compared at the precision they are shown on screen (oxygen to 0.1 %,
// pressure to 0.1 psi). That is rounding, not an evidence tolerance. A place that is a single
// point (the Space Station, Earth sea level, the spacesuit) therefore matches only at exactly its
// values: see open question 10 in CLAUDE.md.
import type { Habitat } from '../types/data'

const PSI_PER_ATM = 14.696
const O2_SHOWN = 0.0005 // half of 0.1 %
const PSI_SHOWN = 0.05 // half of 0.1 psi

/** Every place whose oxygen and pressure range holds the values, in the order of habitats.json. */
export function placesContaining(habitats: Habitat[], o2Fraction: number, pressureAtm: number): Habitat[] {
  const psi = pressureAtm * PSI_PER_ATM
  return habitats.filter(
    (h) =>
      o2Fraction >= h.o2_fraction[0] - O2_SHOWN &&
      o2Fraction <= h.o2_fraction[1] + O2_SHOWN &&
      psi >= h.pressure_psi[0] - PSI_SHOWN &&
      psi <= h.pressure_psi[1] + PSI_SHOWN,
  )
}

/**
 * The one place whose evidence applies when several hold the values (the Space Station and Earth
 * are identical; NASA's Moon Base air sits inside the challenge's Moon Base range). The place the
 * user last picked wins while the values are still inside it; otherwise the narrowest range.
 * Null when no place holds the values.
 */
export function evidencePlace(matches: Habitat[], lastPickedId: string): Habitat | null {
  if (matches.length === 0) return null
  const picked = matches.find((h) => h.id === lastPickedId)
  if (picked) return picked
  const width = (h: Habitat) => [h.o2_fraction[1] - h.o2_fraction[0], h.pressure_psi[1] - h.pressure_psi[0]]
  return [...matches].sort((a, b) => {
    const [ao, ap] = width(a)
    const [bo, bp] = width(b)
    return ao - bo || ap - bp
  })[0]
}
