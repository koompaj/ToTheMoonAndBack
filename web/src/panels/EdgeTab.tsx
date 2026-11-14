// OWNER: dashboard + AI workstream.
// A tab stuck to the right edge of the screen, with an illustration and a vertical label.
// Clicking it opens a side drawer. Several can stack (slot 0 = top).
import { forwardRef, type ReactNode } from 'react'

export const EdgeTab = forwardRef<
  HTMLButtonElement,
  { icon: ReactNode; label: string; slot: number; tone: string; open: boolean; badge?: number; onClick: () => void }
>(function EdgeTab({ icon, label, slot, tone, open, badge, onClick }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={`edge-tab edge-${tone}`}
      style={{ top: `calc(30vh + ${slot * 190}px)` }}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={onClick}
    >
      <span className="edge-icon">{icon}</span>
      <span className="edge-label">{label}</span>
      {badge !== undefined && badge > 0 && <span className="edge-badge">{badge}</span>}
    </button>
  )
})
