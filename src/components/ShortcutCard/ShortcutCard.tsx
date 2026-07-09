import type { Shortcut } from '../../types/dashboard'
import './ShortcutCard.css'

export interface ShortcutCardProps {
  shortcut: Shortcut
  /** Shows Edit/Remove actions when true (User Story 2 management mode). */
  editable?: boolean
  onEdit?: (shortcut: Shortcut) => void
  onRemove?: (shortcut: Shortcut) => void
}

export function ShortcutCard({ shortcut, editable = false, onEdit, onRemove }: ShortcutCardProps) {
  return (
    <div className="shortcut-card">
      <a href={shortcut.url} className="shortcut-card__link">
        <span className="shortcut-card__label">{shortcut.label}</span>
        {shortcut.description ? (
          <span className="shortcut-card__description">{shortcut.description}</span>
        ) : null}
      </a>
      {editable ? (
        <div className="shortcut-card__actions">
          <button
            type="button"
            aria-label={`Edit ${shortcut.label}`}
            onClick={() => onEdit?.(shortcut)}
          >
            Edit
          </button>
          <button
            type="button"
            aria-label={`Remove ${shortcut.label}`}
            onClick={() => onRemove?.(shortcut)}
          >
            Remove
          </button>
        </div>
      ) : null}
    </div>
  )
}
