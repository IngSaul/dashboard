import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { EllipsisVertical, Pencil, Trash2 } from 'lucide-react'
import { GlassIconButton } from '../glass/GlassIconButton/GlassIconButton'
import { getNextRovingIndex, isActivationKey, isRovingNavigationKey } from '../../utils/keyboard'
import './CategoryActionsMenu.css'

export interface CategoryActionsMenuProps {
  /** Category name, used to build accessible names for the trigger and menu items. */
  label: string
  onEdit: () => void
  onDelete: () => void
  className?: string
}

interface MenuAction {
  label: string
  onSelect: () => void
}

/**
 * Per-category overflow menu (⋮) in `CategoryNav`, hidden until its entry is
 * hovered or gains focus (`CategoryNav.css`'s `:hover`/`:focus-within`
 * reveal). Same floating-popup + roving-tabindex + click-outside-to-close
 * shape as `ShortcutActionsMenu` — kept as a separate component (rather than
 * a shared generic one) since the two live in unrelated parents with their
 * own hover-reveal selectors.
 */
export function CategoryActionsMenu({ label, onEdit, onDelete, className = '' }: CategoryActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const menuRef = useRef<HTMLUListElement | null>(null)
  const menuId = useId()

  const actions: MenuAction[] = [
    { label: 'Editar', onSelect: onEdit },
    { label: 'Eliminar', onSelect: onDelete },
  ]

  useEffect(() => {
    if (!open) {
      return
    }
    menuRef.current?.focus()
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  function closeAndRefocus() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  function selectAction(index: number) {
    const action = actions[index]
    if (!action) {
      return
    }
    closeAndRefocus()
    action.onSelect()
  }

  function handleMenuKeyDown(event: ReactKeyboardEvent<HTMLUListElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeAndRefocus()
      return
    }
    if (isActivationKey(event.key)) {
      event.preventDefault()
      selectAction(activeIndex)
      return
    }
    if (isRovingNavigationKey(event.key)) {
      event.preventDefault()
      const key = event.key
      setActiveIndex((current) => getNextRovingIndex(current, actions.length, key))
    }
  }

  return (
    <div className={`category-actions-menu ${className}`.trim()} ref={containerRef}>
      <GlassIconButton
        ref={triggerRef}
        aria-label={`Acciones para la categoría ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="category-actions-menu__trigger"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setOpen((current) => !current)
        }}
      >
        <EllipsisVertical aria-hidden="true" />
      </GlassIconButton>
      {open && (
        <ul
          role="menu"
          id={menuId}
          className="category-actions-menu__list"
          aria-label={`Acciones para la categoría ${label}`}
          tabIndex={-1}
          ref={menuRef}
          onKeyDown={handleMenuKeyDown}
        >
          {actions.map((action, index) => (
            <li
              key={action.label}
              role="menuitem"
              className={`category-actions-menu__item ${
                index === activeIndex ? 'category-actions-menu__item--active' : ''
              }`.trim()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectAction(index)}
            >
              {action.label === 'Editar' ? <Pencil aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
              {action.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
