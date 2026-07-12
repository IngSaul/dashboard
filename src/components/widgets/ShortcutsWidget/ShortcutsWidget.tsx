import { useMemo, useState } from 'react'
import { CategoryNav } from '../../CategoryNav/CategoryNav'
import { ShortcutCard } from '../../ShortcutCard/ShortcutCard'
import { AddShortcutCard } from '../../AddShortcutCard/AddShortcutCard'
import { StatusMessage } from '../../StatusMessage/StatusMessage'
import { EditShortcutModal } from '../../EditShortcutModal/EditShortcutModal'
import { AddShortcutModal } from '../../AddShortcutModal/AddShortcutModal'
import { EditCategoryModal } from '../../EditCategoryModal/EditCategoryModal'
import { AddCategoryModal } from '../../AddCategoryModal/AddCategoryModal'
import { GlassConfirmDialog } from '../../glass/GlassConfirmDialog/GlassConfirmDialog'
import { filterShortcutsByCategory } from '../../../services/categories'
import type { CategoryInput, CategoryMutationResult } from '../../../services/categories'
import { useShortcutLibrary } from '../../../state/useShortcutLibrary'
import type { Shortcut, ShortcutCategory } from '../../../types/dashboard'
import './ShortcutsWidget.css'

/**
 * Shortcuts grid: category filtering/management (`CategoryNav`) + launch
 * cards (`ShortcutCard`), with a trailing `AddShortcutCard` tile that's
 * always the grid's last child. Hovering a launch card reveals its corner
 * menu (Editar/Eliminar), wired to `useShortcutLibrary`'s mutation helpers,
 * `EditShortcutModal`, and a `GlassConfirmDialog` for delete; the trailing
 * tile opens `AddShortcutModal` to create a new one. Category entries get
 * the same edit/delete treatment via `CategoryActionsMenu` (inside
 * `CategoryNav`), `EditCategoryModal`, and a second `GlassConfirmDialog` —
 * deleting a category unassigns (not deletes) its shortcuts, handled by
 * `useShortcutLibrary.deleteCategory`. `CategoryNav`'s own trailing
 * `AddCategoryCard` tile opens `AddCategoryModal`; a successful create
 * auto-selects the new category (`handleCreateCategory`) so it's visible
 * immediately without a reload. New shortcuts are appended to the end of
 * the array (`addShortcut`) and filtering never reorders, so the "+" tile
 * stays last with no extra ordering logic.
 */
export function ShortcutsWidget() {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [editingShortcut, setEditingShortcut] = useState<Shortcut | null>(null)
  const [pendingDeleteShortcut, setPendingDeleteShortcut] = useState<Shortcut | null>(null)
  const [editingCategory, setEditingCategory] = useState<ShortcutCategory | null>(null)
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState<ShortcutCategory | null>(null)
  const [isAddModalOpen, setAddModalOpen] = useState(false)
  const [isAddCategoryModalOpen, setAddCategoryModalOpen] = useState(false)
  const {
    shortcuts,
    categories,
    createShortcut,
    editShortcut,
    deleteShortcut,
    createCategory,
    editCategory,
    deleteCategory,
  } = useShortcutLibrary()

  // Every visible category, not just non-empty ones — an empty category
  // still needs to be reachable here to be renamed or deleted.
  const visibleCategories = useMemo(
    () => categories.filter((category) => category.isVisible),
    [categories],
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

  function handleConfirmDeleteCategory() {
    if (!pendingDeleteCategory) {
      return
    }
    deleteCategory(pendingDeleteCategory.id)
    if (activeCategoryId === pendingDeleteCategory.id) {
      setActiveCategoryId(null)
    }
    setPendingDeleteCategory(null)
  }

  /** Auto-selects the newly created category so it's visible immediately. */
  function handleCreateCategory(input: CategoryInput): CategoryMutationResult {
    const result = createCategory(input)
    if (result.ok) {
      const created = result.categories.at(-1)
      if (created) {
        setActiveCategoryId(created.id)
      }
    }
    return result
  }

  return (
    <div className="shortcuts-widget">
      <CategoryNav
        categories={visibleCategories}
        activeCategoryId={activeCategoryId}
        onSelectCategory={setActiveCategoryId}
        onEditCategory={setEditingCategory}
        onDeleteCategory={setPendingDeleteCategory}
        onAddCategory={() => setAddCategoryModalOpen(true)}
      />
      {visibleShortcuts.length === 0 ? <StatusMessage message="Aún no hay accesos directos." /> : null}
      <div className="shortcuts-widget__grid">
        {visibleShortcuts.map((shortcut) => (
          <ShortcutCard
            key={shortcut.id}
            shortcut={shortcut}
            onEdit={setEditingShortcut}
            onRemove={setPendingDeleteShortcut}
          />
        ))}
        <AddShortcutCard onClick={() => setAddModalOpen(true)} />
      </div>
      <EditShortcutModal
        key={editingShortcut?.id ?? 'edit-shortcut-modal'}
        open={editingShortcut !== null}
        shortcut={editingShortcut}
        categories={categories}
        onClose={() => setEditingShortcut(null)}
        onSave={editShortcut}
      />
      <AddShortcutModal
        open={isAddModalOpen}
        categories={categories}
        onClose={() => setAddModalOpen(false)}
        onCreate={createShortcut}
      />
      <GlassConfirmDialog
        open={pendingDeleteShortcut !== null}
        title="Eliminar acceso directo"
        message={`¿Eliminar "${pendingDeleteShortcut?.label ?? ''}"? Esta acción no se puede deshacer.`}
        onCancel={() => setPendingDeleteShortcut(null)}
        onConfirm={handleConfirmDelete}
      />
      <EditCategoryModal
        key={editingCategory?.id ?? 'edit-category-modal'}
        open={editingCategory !== null}
        category={editingCategory}
        onClose={() => setEditingCategory(null)}
        onSave={editCategory}
      />
      <GlassConfirmDialog
        open={pendingDeleteCategory !== null}
        title="Eliminar categoría"
        message={`¿Eliminar la categoría "${pendingDeleteCategory?.name ?? ''}"? Sus accesos directos no se eliminarán, quedarán sin categoría.`}
        onCancel={() => setPendingDeleteCategory(null)}
        onConfirm={handleConfirmDeleteCategory}
      />
      <AddCategoryModal
        open={isAddCategoryModalOpen}
        onClose={() => setAddCategoryModalOpen(false)}
        onCreate={handleCreateCategory}
      />
    </div>
  )
}
