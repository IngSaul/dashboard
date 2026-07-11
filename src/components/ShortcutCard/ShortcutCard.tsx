import { DynamicIcon, type IconName } from 'lucide-react/dynamic'
import { getInitials } from '../../services/iconProvider'
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
 * Renders `shortcut.icon` (resolved via `iconProvider`, see T085/T088) with
 * no layout difference by provider — every branch renders inside the same
 * fixed-size `.shortcut-card__icon` wrapper (UI contract's Icon System
 * section). A shortcut created before the icon system existed, or whose
 * resolution hasn't run yet, has no `icon` at all — that's treated the
 * same as an explicit `fallback` (initials tile), never a broken image.
 */
function ShortcutIcon({ shortcut }: { shortcut: Shortcut }) {
  const icon = shortcut.icon

  if (!icon || icon.provider === 'fallback') {
    return (
      <span className="shortcut-card__icon" data-icon-provider="fallback" aria-hidden="true">
        {icon?.value ?? getInitials(shortcut.label)}
      </span>
    )
  }

  switch (icon.provider) {
    case 'lucide':
      return (
        <span className="shortcut-card__icon" data-icon-provider="lucide" aria-hidden="true">
          <DynamicIcon name={icon.value as IconName} />
        </span>
      )
    case 'simple-icons':
    case 'custom-svg':
      return (
        <span
          className="shortcut-card__icon"
          data-icon-provider={icon.provider}
          aria-hidden="true"
          // Simple Icons SVGs come from a trusted bundled dependency;
          // custom-svg has no authoring UI yet (a future task), so this
          // path isn't reachable from user input in this feature.
          dangerouslySetInnerHTML={{ __html: icon.value }}
        />
      )
    case 'favicon':
      return (
        <span className="shortcut-card__icon" data-icon-provider="favicon" aria-hidden="true">
          <img src={icon.value} alt="" />
        </span>
      )
  }
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
            aria-label={`Move ${shortcut.label} up`}
            disabled={!canMoveUp}
            onClick={() => onMoveUp?.(shortcut)}
          >
            Up
          </button>
          <button
            type="button"
            aria-label={`Move ${shortcut.label} down`}
            disabled={!canMoveDown}
            onClick={() => onMoveDown?.(shortcut)}
          >
            Down
          </button>
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
