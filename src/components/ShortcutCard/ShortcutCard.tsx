import type { Shortcut } from '../../types/dashboard'
import './ShortcutCard.css'

export interface ShortcutCardProps {
  shortcut: Shortcut
}

/**
 * Read-only shortcut card for User Story 1. Edit/remove actions are added
 * on top of this in User Story 2 (T043).
 */
export function ShortcutCard({ shortcut }: ShortcutCardProps) {
  return (
    <a href={shortcut.url} className="shortcut-card">
      <span className="shortcut-card__label">{shortcut.label}</span>
      {shortcut.description ? (
        <span className="shortcut-card__description">{shortcut.description}</span>
      ) : null}
    </a>
  )
}
