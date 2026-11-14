// OWNER: dashboard + AI workstream.
import type { PlaceArtKind } from './SpaceArt'
import type { Habitat } from '../types/data'
// Places crews live. Real habitats come from habitats.json (workstream A, each with a source).
// FUTURE_PLACES are slots for places we plan to add once A finds a NASA source for their air:
// they show on the home page as "waiting for a source" and disappear automatically when a habitat
// with the same id appears in habitats.json. Add or rename slots here freely; never put numbers here.
export interface FuturePlace {
  id: string
  name: string
  why: string
}

// Empty by team decision: the app shows only the places with sourced NASA air numbers.
export const FUTURE_PLACES: FuturePlace[] = []

/** Short display names for real habitats. */
export function placeName(id: string, fallback: string) {
  return (
    {
      moon_base: 'Moon Base & Rovers (Challenge)',
      moon_base_nasa: 'Moon Base (NASA Air)',
      iss: 'Space Station (ISS)',
      spacesuit: 'Spacesuit',
      earth_sea_level: 'Earth (Sea Level)',
    } as Record<string, string>
  )[id] ?? fallback
}

/** Where partial-gravity data may come from (challenge page: "LUCI and FM2 may add some"). */
export const PARTIAL_G_NOTE = 'Every test in PSI\u2019s tables ran in microgravity. Partial-gravity data may come later (LUCI, FM2, per the challenge page).'

/** A few words for a place card: does the place's gravity match the gravity of the tests in its air?
 *  insideAir = tests in the place's air; matching = those that also match its gravity. */
export function gravityShort(hab: Habitat, insideAir: number, matching: number): string | null {
  if (!hab.gravity) return null
  if (insideAir === 0) return `Gravity: ${hab.gravity.label}`
  if (matching === insideAir) return 'Air and gravity both match'
  const moon = hab.gravity.g.some((g) => g > 0.1 && g < 0.3)
  if (matching === 0 && moon) return 'Tests at Moon gravity: none yet'
  if (matching === 0) return `All ran in microgravity, not ${hab.gravity.label.replace(/ \(.*\)$/, '')}`
  return `${matching} of ${insideAir} also match its gravity`
}

/** Which illustration a place uses on its pages. */
export function placeArt(id: string): PlaceArtKind {
  // Every place gets its own picture.
  if (id === 'moon_base') return 'moon'
  if (id === 'moon_base_nasa') return 'moonbase'
  if (id === 'iss') return 'station'
  if (id === 'spacesuit') return 'helmet'
  if (id === 'earth_sea_level') return 'earth'
  return 'planet'
}
