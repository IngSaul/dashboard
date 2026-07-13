import { useState, type KeyboardEventHandler } from 'react'
import { createPortal } from 'react-dom'
import {
  DndContext,
  DragOverlay,
  KeyboardCode,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ShortcutCard } from '../ShortcutCard/ShortcutCard'
import type { Shortcut } from '../../types/dashboard'

export interface ShortcutGridProps {
  shortcuts: Shortcut[]
  onEdit?: (shortcut: Shortcut) => void
  onRemove?: (shortcut: Shortcut) => void
  /**
   * Fires on drop with the dragged shortcut's id and the id it was dropped
   * beside — never array math or category logic, that's `moveShortcut`'s
   * job (`services/shortcuts.ts`, via `useShortcutLibrary`). It only ever
   * moves the dragged shortcut's `globalOrder` next to the drop target's;
   * its `categoryId` is never touched here, so dropping it beside a card
   * from a different category reorders it globally without re-categorizing
   * it.
   */
  onReorder?: (activeId: string, overId: string) => void
}

/**
 * Renders `shortcuts` in the exact order it receives — all ordering and
 * persistence decisions belong to `ShortcutsWidget`/`useShortcutLibrary`.
 * Wraps the list in `@dnd-kit` sortable wiring (mouse: instant drag past a
 * 4px move; touch: ~250ms long-press; keyboard: full sortable support) and
 * reports the new order via `onReorder` on drop — it never mutates or
 * persists anything itself. Renders no wrapping element: callers place this
 * directly inside their own CSS grid container so cards stay real grid
 * items (needed for `rectSortingStrategy` and the trailing `AddShortcutCard`
 * tile to lay out together).
 *
 * Dragging is always enabled, including in "Todas", and a card can be
 * dropped anywhere — moving it beside a card from a different category
 * only changes its `globalOrder`, never its `categoryId` (`moveShortcut`
 * never re-categorizes). "Todas" has no order of its own: it's the single
 * `globalOrder`-sorted sequence with nothing filtered out, so a drop there
 * immediately reflects the shortcut's new global position; switching to a
 * filtered category tab still shows it only if its `categoryId` matches,
 * now at whatever relative position that global move left it in.
 */
export function ShortcutGrid({ shortcuts, onEdit, onRemove, onReorder }: ShortcutGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeSize, setActiveSize] = useState<{ width: number; height: number } | null>(null)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    // `Enter` is deliberately excluded from `start`/`end`: the sortable
    // node is the shortcut's own `<a>` link (see `SortableShortcutCard`),
    // and `Enter` must keep opening it rather than being hijacked for
    // pick-up/drop — only `Space` (which has no native effect on a
    // focused link) drives keyboard drag.
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: {
        start: [KeyboardCode.Space],
        cancel: [KeyboardCode.Esc],
        end: [KeyboardCode.Space],
      },
    }),
  )

  const activeShortcut = shortcuts.find((shortcut) => shortcut.id === activeId) ?? null

  function handleDragStart(event: DragStartEvent): void {
    setActiveId(String(event.active.id))
    const rect = event.active.rect.current.initial
    setActiveSize(rect ? { width: rect.width, height: rect.height } : null)
  }

  function resetActiveDrag(): void {
    setActiveId(null)
    setActiveSize(null)
  }

  function handleDragEnd(event: DragEndEvent): void {
    resetActiveDrag()
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }
    onReorder?.(String(active.id), String(over.id))
  }

  function handleDragCancel(): void {
    resetActiveDrag()
  }

  const announcements: Announcements = {
    onDragStart({ active }) {
      const label = shortcuts.find((shortcut) => shortcut.id === active.id)?.label ?? ''
      return `${label} se ha tomado para reordenar.`
    },
    onDragOver({ active, over }) {
      const label = shortcuts.find((shortcut) => shortcut.id === active.id)?.label ?? ''
      if (!over) {
        return `${label} está sobre su posición original.`
      }
      const overIndex = shortcuts.findIndex((shortcut) => shortcut.id === over.id)
      return `${label} se movió a la posición ${overIndex + 1} de ${shortcuts.length}.`
    },
    onDragEnd({ active, over }) {
      const label = shortcuts.find((shortcut) => shortcut.id === active.id)?.label ?? ''
      if (!over) {
        return `${label} volvió a su posición original.`
      }
      const overIndex = shortcuts.findIndex((shortcut) => shortcut.id === over.id)
      return `${label} se soltó en la posición ${overIndex + 1} de ${shortcuts.length}.`
    },
    onDragCancel({ active }) {
      const label = shortcuts.find((shortcut) => shortcut.id === active.id)?.label ?? ''
      return `Reordenamiento de ${label} cancelado.`
    },
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      // Portaled to `document.body` for the same reason as `DragOverlay`
      // below, plus one more: left in-tree, `@dnd-kit/accessibility`'s
      // hidden `role="status"` live region would nest inside this specific
      // widget's DOM, making it a second, ambiguous `status` region
      // wherever a test (or assistive tech) queries "the" status role
      // scoped to this widget.
      accessibility={{ announcements, container: document.body }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={shortcuts.map((shortcut) => shortcut.id)} strategy={rectSortingStrategy}>
        {shortcuts.map((shortcut) => (
          <SortableShortcutCard
            key={shortcut.id}
            shortcut={shortcut}
            {...(onEdit !== undefined ? { onEdit } : {})}
            {...(onRemove !== undefined ? { onRemove } : {})}
          />
        ))}
      </SortableContext>
      {/*
       * `DragOverlay` renders in-tree (this `@dnd-kit` version doesn't
       * portal it itself) — every widget is wrapped in a `.glass-panel`
       * with `backdrop-filter`, which establishes its own containing block
       * for `position: fixed` descendants per the CSS spec. Left alone, the
       * overlay ends up positioned relative to that widget card instead of
       * the viewport, offsetting it from the cursor. Portaling explicitly
       * to `document.body` (transform/filter-free) sidesteps that.
       */}
      {createPortal(
        <DragOverlay>
          {activeShortcut ? (
            <div style={activeSize ? { width: activeSize.width, height: activeSize.height } : undefined}>
              <ShortcutCard shortcut={activeShortcut} isDragOverlay />
            </div>
          ) : null}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  )
}

interface SortableShortcutCardProps {
  shortcut: Shortcut
  onEdit?: (shortcut: Shortcut) => void
  onRemove?: (shortcut: Shortcut) => void
}

function SortableShortcutCard({ shortcut, onEdit, onRemove }: SortableShortcutCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: shortcut.id })
  const { onKeyDown, ...pointerListeners } = listeners ?? {}

  return (
    <ShortcutCard
      shortcut={shortcut}
      {...(onEdit !== undefined ? { onEdit } : {})}
      {...(onRemove !== undefined ? { onRemove } : {})}
      cardRef={setNodeRef}
      cardStyle={{
        touchAction: 'none',
        ...(transform ? { transform: CSS.Transform.toString(transform) } : {}),
        ...(transition ? { transition } : {}),
      }}
      cardDragProps={pointerListeners}
      linkRef={setActivatorNodeRef}
      linkDragProps={{
        ...(onKeyDown ? { onKeyDown: onKeyDown as KeyboardEventHandler<HTMLAnchorElement> } : {}),
        'aria-roledescription': attributes['aria-roledescription'],
        'aria-describedby': attributes['aria-describedby'],
      }}
      isDragPlaceholder={isDragging}
    />
  )
}
