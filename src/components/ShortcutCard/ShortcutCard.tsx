import type { CSSProperties, HTMLAttributes, Ref } from 'react'
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
  /**
   * Drag wiring for `ShortcutGrid`'s sortable list — deliberately untyped
   * against any specific DnD library so this component stays presentational;
   * `ShortcutGrid` owns the `@dnd-kit` integration and just spreads its
   * `useSortable()` output through here. Split across the root `<div>` and
   * the inner `<a>` on purpose: the root gets the ref (for rect measurement
   * so the transform-based lift/reflow animates correctly) and the
   * pointer/touch listeners (so grabbing anywhere on the card starts a
   * drag), while the *link* keeps being the sole focusable/tabbable
   * element — putting a second `tabIndex` on the root would double the
   * card's tab stops. Keyboard drag activation therefore lives on the link
   * too (`linkDragProps`), restricted by `ShortcutGrid` to the `Space` key
   * only, so `Enter` still opens the shortcut instead of being hijacked for
   * "pick up".
   */
  cardRef?: Ref<HTMLDivElement>
  cardStyle?: CSSProperties
  cardDragProps?: HTMLAttributes<HTMLDivElement>
  linkRef?: Ref<HTMLAnchorElement>
  linkDragProps?: HTMLAttributes<HTMLAnchorElement>
  /** This card is the floating `DragOverlay` clone being carried under the pointer. */
  isDragOverlay?: boolean
  /** This card is the original grid slot while it's the active drag source (the overlay clone represents it visually instead). */
  isDragPlaceholder?: boolean
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
  cardRef,
  cardStyle,
  cardDragProps,
  linkRef,
  linkDragProps,
  isDragOverlay = false,
  isDragPlaceholder = false,
}: ShortcutCardProps) {
  const showCornerMenu = !editable && (onEdit !== undefined || onRemove !== undefined)
  const cardClassName = [
    'shortcut-card',
    isDragOverlay ? 'shortcut-card--dragging' : null,
    isDragPlaceholder ? 'shortcut-card--placeholder' : null,
  ]
    .filter((name): name is string => name !== null)
    .join(' ')

  return (
    <div ref={cardRef} style={cardStyle} className={cardClassName} {...cardDragProps}>
      <a
        ref={linkRef}
        href={shortcut.url}
        className="shortcut-card__link"
        target="_blank"
        rel="noopener noreferrer"
        {...linkDragProps}
      >
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
