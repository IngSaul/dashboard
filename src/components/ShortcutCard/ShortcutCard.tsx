import { DynamicIcon, type IconName } from 'lucide-react/dynamic'
import { resolveShortcutIcon } from '../../services/iconResolver'
import type { Shortcut } from '../../types/dashboard'
import './ShortcutCard.css'

export interface ShortcutCardProps {
  shortcut: Shortcut
  /** Shows Edit/Remove/Move actions when true (User Story 2 management mode). */
  editable?: boolean
  canMoveUp?: boolean
  canMoveDown?: boolean
  onEdit?: (shortcut: Shortcut) => void
  onRemove?: (shortcut: Shortcut) => void
  onMoveUp?: (shortcut: Shortcut) => void
  onMoveDown?: (shortcut: Shortcut) => void
}

/**
 * Renders the shortcut's icon with no layout difference by provider — every
 * branch renders inside the same fixed-size `.shortcut-card__icon` wrapper
 * (UI contract's Icon System section). A manually-chosen `lucide`/`custom-svg`
 * icon (set via the shortcut editor, T085/T088) always wins, since that's an
 * explicit user override; everything else is derived fresh from the
 * shortcut's URL via `iconResolver` on every render — real colored brand
 * icon when the destination is recognized, generic Globe glyph otherwise —
 * so a shortcut's icon never depends on stale editor-time favicon/initials
 * resolution and never relies on the shortcut's title.
 */
function ShortcutIcon({ shortcut }: { shortcut: Shortcut }) {
  const icon = shortcut.icon

  if (icon && (icon.provider === 'lucide' || icon.provider === 'custom-svg')) {
    return icon.provider === 'lucide' ? (
      <span className="shortcut-card__icon" data-icon-provider="lucide" aria-hidden="true">
        <DynamicIcon name={icon.value as IconName} />
      </span>
    ) : (
      <span
        className="shortcut-card__icon"
        data-icon-provider="custom-svg"
        aria-hidden="true"
        // custom-svg has no authoring UI yet (a future task), so this path
        // isn't reachable from user input in this feature.
        dangerouslySetInnerHTML={{ __html: icon.value }}
      />
    )
  }

  const resolved = resolveShortcutIcon(shortcut.url)
  return (
    <span
      className="shortcut-card__icon"
      data-icon-provider={resolved.match}
      style={{ color: resolved.color }}
      title={resolved.label}
      aria-hidden="true"
    >
      {resolved.svg ? (
        <span dangerouslySetInnerHTML={{ __html: resolved.svg }} />
      ) : resolved.Icon ? (
        <resolved.Icon color={resolved.color} />
      ) : null}
    </span>
  )
}

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
    </div>
  )
}
