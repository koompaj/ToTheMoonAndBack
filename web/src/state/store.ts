// SHARED - the selection state every part of the app reads and writes.
// The 3D scene and the panels talk to each other ONLY through this store.
// Change only by agreement of all three workstreams (see CLAUDE.md, "Shared files").
import { create } from 'zustand'

export interface AppState {
  selectedHabitatId: string | null
  selectedTestId: string | null
  /** Show inverse-flame tests, whose oxygen is burner gas rather than cabin air. */
  showBurnerOxidizer: boolean
  view: '3d' | '2d'
  selectHabitat: (id: string | null) => void
  selectTest: (id: string | null) => void
  setShowBurnerOxidizer: (v: boolean) => void
  setView: (v: '3d' | '2d') => void
}

export const useApp = create<AppState>((set) => ({
  selectedHabitatId: 'moon_base',
  selectedTestId: null,
  showBurnerOxidizer: false,
  view: '3d',
  selectHabitat: (id) => set({ selectedHabitatId: id }),
  selectTest: (id) => set({ selectedTestId: id }),
  setShowBurnerOxidizer: (v) => set({ showBurnerOxidizer: v }),
  setView: (v) => set({ view: v }),
}))
