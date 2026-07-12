import { ShortcutIcon } from '../ShortcutIcon/ShortcutIcon'
import { ShortcutActionsMenu } from '../ShortcutActionsMenu/ShortcutActionsMenu'
import type { Shortcut } from '../../types/dashboard'
import './ShortcutCard.css'

export interface ShortcutCardProps {
  shortcut: Shortcut
  /** Shows the inline Subir/Bajar/Editar/Eliminar row (Settings drawer's management list) instead of the hover corner menu. */
  editable?: boolean
  canMoveUp?: boolean
  canMoveDown?: boolean
  onEdit?: (shortcut: Shortcut) => void
  onRemove?: (shortcut: Shortcut) => void
  onMoveUp?: (shortcut: Shortcut) => void
  onMoveDown?: (shortcut: Shortcut) => void
}

/**
 * `editable` (Settings drawer) keeps the original always-visible
 * Subir/Bajar/Editar/Eliminar row. Everywhere else (the main dashboard
 * grid), passing `onEdit`/`onRemove` without `editable` renders the
 * hover-revealed corner `ShortcutActionsMenu` instead — the card itself
 * only picks which actions UI to show, it owns no menu/modal state.
 */
export function ShortcutCard({
  shortcut,
  editable = false,
  canMoveUp = false,
  canMoveDown = false,
  onEdit,
  onRemove,
  onMoveUp,
  onMoveDown,
}: ShortcutCardProps) {
  const showCornerMenu = !editable && (onEdit !== undefined || onRemove !== undefined)

  return (
    <div className="shortcut-card">
      <a href={shortcut.url} className="shortcut-card__link" target="_blank" rel="noopener noreferrer">
        <ShortcutIcon shortcut={shortcut} />
        <span className="shortcut-card__label">{shortcut.label}</span>
        {shortcut.description ? (
          <span className="shortcut-card__description">{shortcut.description}</span>
        ) : null}
      </a>
      {editable ? (
        <div className="shortcut-card__actions">
          <button
            type="button"
            aria-label={`Subir ${shortcut.label}`}
            disabled={!canMoveUp}
            onClick={() => onMoveUp?.(shortcut)}
          >
            Subir
          </button>
          <button
            type="button"
            aria-label={`Bajar ${shortcut.label}`}
            disabled={!canMoveDown}
            onClick={() => onMoveDown?.(shortcut)}
          >
            Bajar
          </button>
          <button
            type="button"
            aria-label={`Editar ${shortcut.label}`}
            onClick={() => onEdit?.(shortcut)}
          >
            Editar
          </button>
          <button
            type="button"
            aria-label={`Eliminar ${shortcut.label}`}
            onClick={() => onRemove?.(shortcut)}
          >
            Eliminar
          </button>
        </div>
      ) : null}
      {showCornerMenu ? (
        <ShortcutActionsMenu
          label={shortcut.label}
          onEdit={() => onEdit?.(shortcut)}
          onDelete={() => onRemove?.(shortcut)}
        />
      ) : null}
    </div>
  )
}
