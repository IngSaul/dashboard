import { Plus } from 'lucide-react'
import './AddShortcutCard.css'

export interface AddShortcutCardProps {
  onClick: () => void
}

/**
 * Trailing grid tile that opens `AddShortcutModal` — deliberately styled
 * as an empty, lower-opacity `ShortcutCard` (large centered "+", no label)
 * rather than a traditional button, so it reads as "the next slot" in the
 * grid (the iOS/Android/Notion "add tile" pattern) instead of a separate
 * toolbar action. Composes the same `.shortcut-card` class every other
 * card uses, so size/glass styling stay identical automatically. No
 * creation logic lives here — it only reports the click; `ShortcutsWidget`
 * owns the modal's open state and `useShortcutLibrary`'s `createShortcut`.
 */
export function AddShortcutCard({ onClick }: AddShortcutCardProps) {
  return (
    <button
      type="button"
      className="shortcut-card add-shortcut-card"
      aria-label="Añadir acceso directo"
      onClick={onClick}
    >
      <Plus className="add-shortcut-card__icon" aria-hidden="true" />
    </button>
  )
}
