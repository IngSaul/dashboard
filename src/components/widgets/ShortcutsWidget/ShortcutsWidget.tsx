import { useMemo, useState } from 'react'
import { CategoryNav } from '../../CategoryNav/CategoryNav'
import { ShortcutCard } from '../../ShortcutCard/ShortcutCard'
import { StatusMessage } from '../../StatusMessage/StatusMessage'
import { EditShortcutModal } from '../../EditShortcutModal/EditShortcutModal'
import { GlassConfirmDialog } from '../../glass/GlassConfirmDialog/GlassConfirmDialog'
import { filterShortcutsByCategory, getNonEmptyCategories } from '../../../services/categories'
import { useShortcutLibrary } from '../../../state/useShortcutLibrary'
import type { Shortcut } from '../../../types/dashboard'
import './ShortcutsWidget.css'

/**
 * Shortcuts grid: category filtering (`CategoryNav`) + launch cards
 * (`ShortcutCard`). Unlike before, cards here aren't read-only — hovering a
 * card reveals its corner menu (Editar/Eliminar), wired to
 * `useShortcutLibrary`'s mutation helpers, `EditShortcutModal`, and a
 * `GlassConfirmDialog` for delete. `ShortcutSettings`/`SettingsDrawer`'s
 * add form and Subir/Bajar row still exist unchanged alongside this — this
 * widget just stops being launch-only.
 */
export function ShortcutsWidget() {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [editingShortcut, setEditingShortcut] = useState<Shortcut | null>(null)
  const [pendingDeleteShortcut, setPendingDeleteShortcut] = useState<Shortcut | null>(null)
  const { shortcuts, categories, editShortcut, deleteShortcut } = useShortcutLibrary()

  const visibleCategories = useMemo(
    () => getNonEmptyCategories(categories, shortcuts),
    [categories, shortcuts],
  )
  const visibleShortcuts = useMemo(
    () => filterShortcutsByCategory(shortcuts, activeCategoryId),
    [shortcuts, activeCategoryId],
  )

  function handleConfirmDelete() {
    if (!pendingDeleteShortcut) {
      return
    }
    deleteShortcut(pendingDeleteShortcut.id)
    setPendingDeleteShortcut(null)
  }

  return (
    <div className="shortcuts-widget">
      <CategoryNav
        categories={visibleCategories}
        activeCategoryId={activeCategoryId}
        onSelectCategory={setActiveCategoryId}
      />
      {visibleShortcuts.length === 0 ? (
        <StatusMessage message="Aún no hay accesos directos." />
      ) : (
        <div className="shortcuts-widget__grid">
          {visibleShortcuts.map((shortcut) => (
            <ShortcutCard
              key={shortcut.id}
              shortcut={shortcut}
              onEdit={setEditingShortcut}
              onRemove={setPendingDeleteShortcut}
            />
          ))}
        </div>
      )}
      <EditShortcutModal
        key={editingShortcut?.id ?? 'edit-shortcut-modal'}
        open={editingShortcut !== null}
        shortcut={editingShortcut}
        categories={categories}
        onClose={() => setEditingShortcut(null)}
        onSave={editShortcut}
      />
      <GlassConfirmDialog
        open={pendingDeleteShortcut !== null}
        title="Eliminar acceso directo"
        message={`¿Eliminar "${pendingDeleteShortcut?.label ?? ''}"? Esta acción no se puede deshacer.`}
        onCancel={() => setPendingDeleteShortcut(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
