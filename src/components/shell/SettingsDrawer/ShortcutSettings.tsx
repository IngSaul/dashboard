import { useState } from 'react'
import { Settings } from '../../Settings/Settings'
import { ShortcutCard } from '../../ShortcutCard/ShortcutCard'
import {
  addCategory,
  type CategoryInput,
  type CategoryMutationResult,
} from '../../../services/categories'
import { loadDashboardConfig, saveDashboardConfig } from '../../../services/configStore'
import {
  addShortcut,
  removeShortcut,
  reorderShortcuts,
  updateShortcut,
  type ShortcutInput,
  type ShortcutMutationResult,
} from '../../../services/shortcuts'
import type { Shortcut, ShortcutCategory } from '../../../types/dashboard'
import './ShortcutSettings.css'

/**
 * Shortcut/category management: composes the existing `Settings` (add/edit
 * form) and `ShortcutCard` (editable mode) — the same components feature
 * 001 already built and tested — inside the settings drawer.
 * `ShortcutsWidget` on the main dashboard stays a deliberately read-only
 * browse/launch view (UI contract's Shortcuts Widget Boundary); this is
 * where add/edit/remove/reorder actually happens.
 *
 * `shortcuts`/`categories` have no owning 002 state slice (same situation
 * as `weatherPreference`/`monitoringSourceConfig`), so this reads/writes
 * them directly through `configStore`, re-reading the full config at save
 * time so a concurrent edit to an unrelated field is never clobbered.
 */
export function ShortcutSettings() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(() => loadDashboardConfig().shortcuts)
  const [categories, setCategories] = useState<ShortcutCategory[]>(
    () => loadDashboardConfig().categories,
  )
  const [editingShortcutId, setEditingShortcutId] = useState<string | null>(null)

  function persistShortcuts(next: Shortcut[]): void {
    const config = loadDashboardConfig()
    saveDashboardConfig({ ...config, shortcuts: next })
    setShortcuts(next)
  }

  function persistCategories(next: ShortcutCategory[]): void {
    const config = loadDashboardConfig()
    saveDashboardConfig({ ...config, categories: next })
    setCategories(next)
  }

  function handleSubmit(input: ShortcutInput): ShortcutMutationResult {
    const result = editingShortcutId
      ? updateShortcut(shortcuts, editingShortcutId, input)
      : addShortcut(shortcuts, input)
    if (result.ok) {
      persistShortcuts(result.shortcuts)
      setEditingShortcutId(null)
    }
    return result
  }

  function handleAddCategory(input: CategoryInput): CategoryMutationResult {
    const result = addCategory(categories, input)
    if (result.ok) {
      persistCategories(result.categories)
    }
    return result
  }

  function handleRemove(shortcut: Shortcut): void {
    const result = removeShortcut(shortcuts, shortcut.id)
    if (result.ok) {
      persistShortcuts(result.shortcuts)
      if (editingShortcutId === shortcut.id) {
        setEditingShortcutId(null)
      }
    }
  }

  function handleMove(shortcut: Shortcut, direction: 'up' | 'down'): void {
    const ids = shortcuts.map((entry) => entry.id)
    const index = ids.indexOf(shortcut.id)
    const neighborIndex = direction === 'up' ? index - 1 : index + 1
    const neighborId = ids[neighborIndex]
    if (neighborId === undefined) {
      return
    }
    const nextIds = [...ids]
    nextIds[index] = neighborId
    nextIds[neighborIndex] = shortcut.id
    const result = reorderShortcuts(shortcuts, nextIds)
    if (result.ok) {
      persistShortcuts(result.shortcuts)
    }
  }

  const editingShortcut = shortcuts.find((entry) => entry.id === editingShortcutId) ?? null

  return (
    <section className="settings-section" aria-label="Shortcuts">
      <h3 className="settings-section__heading">Shortcuts</h3>
      <Settings
        key={editingShortcut?.id ?? 'new'}
        categories={categories}
        editingShortcut={editingShortcut}
        onSubmit={handleSubmit}
        onCancelEdit={() => setEditingShortcutId(null)}
        onAddCategory={handleAddCategory}
      />
      <ul className="shortcut-settings__list">
        {shortcuts.map((shortcut, index) => (
          <li key={shortcut.id}>
            <ShortcutCard
              shortcut={shortcut}
              editable
              canMoveUp={index > 0}
              canMoveDown={index < shortcuts.length - 1}
              onEdit={(s) => setEditingShortcutId(s.id)}
              onRemove={handleRemove}
              onMoveUp={(s) => handleMove(s, 'up')}
              onMoveDown={(s) => handleMove(s, 'down')}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
