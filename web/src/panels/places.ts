// OWNER: dashboard + AI workstream.
import type { PlaceArtKind } from './SpaceArt'
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
