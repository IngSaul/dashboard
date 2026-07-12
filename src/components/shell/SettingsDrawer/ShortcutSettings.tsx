import { useState } from 'react'
import { Settings } from '../../Settings/Settings'
import {
  addCategory,
  type CategoryInput,
  type CategoryMutationResult,
} from '../../../services/categories'
import { loadDashboardConfig, saveDashboardConfig } from '../../../services/configStore'
import { defaultEventBus } from '../../../services/eventBus'
import { resolveIcon } from '../../../services/iconProvider'
import { addShortcut, type ShortcutInput, type ShortcutMutationResult } from '../../../services/shortcuts'
import type { Shortcut, ShortcutCategory } from '../../../types/dashboard'

/**
 * Add-shortcut/add-category forms in the settings drawer, composing the
 * existing `Settings` component. Per-shortcut editing/deleting now lives
 * on the main grid instead (`ShortcutsWidget`'s hover `ShortcutActionsMenu`
 * + `EditShortcutModal`/`GlassConfirmDialog`) — this section only ever
 * creates new shortcuts/categories, so `Settings` is always used in its
 * add mode (`editingShortcut` is always `null`).
 *
 * `shortcuts`/`categories` have no owning 002 state slice (same situation
 * as `weatherPreference`/`monitoringSourceConfig`), so this reads/writes
 * them directly through `configStore`, re-reading the full config at save
 * time so a concurrent edit to an unrelated field is never clobbered. Every
 * persist also emits `eventBus`'s `shortcuts:changed` — `ShortcutsWidget`
 * only loads shortcuts/categories once on mount (like `WeatherWidget` does
 * for its own preference), so without this it would keep showing stale
 * data in the same session until a full reload.
 *
 * Icon resolution (T085/T088) runs only from here, only on an explicit
 * create — never during normal dashboard render — per
 * contracts/icon-provider-contract.md. It runs in the background (the
 * save itself never blocks on it) and re-reads/re-saves shortcuts at
 * completion time rather than closing over a possibly-stale array, so a
 * second save that happens before the first resolution finishes is never
 * clobbered.
 */
export function ShortcutSettings() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(() => loadDashboardConfig().shortcuts)
  const [categories, setCategories] = useState<ShortcutCategory[]>(
    () => loadDashboardConfig().categories,
  )

  function persistShortcuts(next: Shortcut[]): void {
    const config = loadDashboardConfig()
    saveDashboardConfig({ ...config, shortcuts: next })
    setShortcuts(next)
    defaultEventBus.emit('shortcuts:changed', {})
  }

  function persistCategories(next: ShortcutCategory[]): void {
    const config = loadDashboardConfig()
    saveDashboardConfig({ ...config, categories: next })
    setCategories(next)
    defaultEventBus.emit('shortcuts:changed', {})
  }

  /**
   * Resolves the icon for `shortcutId` in the background and persists it
   * once resolved. Re-reads shortcuts from `configStore` at completion
   * time (not from a closed-over array) so this never clobbers a save
   * that happened while resolution was in flight.
   */
  function resolveAndPersistIcon(
    shortcutId: string,
    url: string,
    label: string,
    currentIcon: Shortcut['icon'],
  ): void {
    void resolveIcon(url, label, currentIcon !== undefined ? { currentIcon } : {}).then((icon) => {
      const config = loadDashboardConfig()
      const nextShortcuts = config.shortcuts.map((entry) =>
        entry.id === shortcutId ? { ...entry, icon } : entry,
      )
      saveDashboardConfig({ ...config, shortcuts: nextShortcuts })
      setShortcuts(nextShortcuts)
      defaultEventBus.emit('shortcuts:changed', {})
    })
  }

  function handleSubmit(input: ShortcutInput): ShortcutMutationResult {
    const result = addShortcut(shortcuts, input)
    if (result.ok) {
      persistShortcuts(result.shortcuts)
      const saved = result.shortcuts.at(-1)
      if (saved) {
        resolveAndPersistIcon(saved.id, saved.url, saved.label, saved.icon)
      }
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

  return (
    <section className="settings-section" aria-label="Accesos directos">
      <h3 className="settings-section__heading">Accesos directos</h3>
      <Settings
        categories={categories}
        editingShortcut={null}
        onSubmit={handleSubmit}
        onCancelEdit={() => {}}
        onAddCategory={handleAddCategory}
      />
    </section>
  )
}
