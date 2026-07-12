import { useEffect, useState } from 'react'
import { loadDashboardConfig, saveDashboardConfig } from '../services/configStore'
import { defaultEventBus } from '../services/eventBus'
import { resolveIcon } from '../services/iconProvider'
import { removeShortcut, updateShortcut, type ShortcutInput, type ShortcutMutationResult } from '../services/shortcuts'
import type { Shortcut, ShortcutCategory } from '../types/dashboard'

export interface ShortcutLibrary {
  shortcuts: Shortcut[]
  categories: ShortcutCategory[]
  editShortcut: (id: string, input: ShortcutInput) => ShortcutMutationResult
  deleteShortcut: (id: string) => ShortcutMutationResult
}

/**
 * `shortcuts`/`categories` have no owning state slice (documented in
 * `ShortcutsWidget`/`ShortcutSettings` — same situation as
 * `weatherPreference`): every consumer reads `configStore` directly and
 * reacts to `eventBus`'s `shortcuts:changed` on its own. This hook is that
 * repeated load-plus-subscribe-plus-persist glue, factored out so
 * `ShortcutsWidget`'s hover-menu edit/delete flow doesn't reimplement it —
 * and so a future drag-and-drop reorder (via the already-existing, already
 * pure `reorderShortcuts`) has one obvious place to add its mutation
 * alongside `editShortcut`/`deleteShortcut`, instead of a third copy of
 * this same load/persist/emit boilerplate.
 */
export function useShortcutLibrary(): ShortcutLibrary {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(() => loadDashboardConfig().shortcuts)
  const [categories, setCategories] = useState<ShortcutCategory[]>(
    () => loadDashboardConfig().categories,
  )

  useEffect(
    () =>
      defaultEventBus.on('shortcuts:changed', () => {
        const config = loadDashboardConfig()
        setShortcuts(config.shortcuts)
        setCategories(config.categories)
      }),
    [],
  )

  function persist(next: Shortcut[]): void {
    const config = loadDashboardConfig()
    saveDashboardConfig({ ...config, shortcuts: next })
    setShortcuts(next)
    defaultEventBus.emit('shortcuts:changed', {})
  }

  /**
   * Re-resolves the icon for `id` in the background and persists it once
   * resolved, re-reading `configStore` at completion time (not from a
   * closed-over array) so this never clobbers a save that happened while
   * resolution was in flight — same approach `ShortcutSettings` uses.
   */
  function resolveAndPersistIcon(id: string, url: string, label: string, currentIcon: Shortcut['icon']): void {
    void resolveIcon(url, label, currentIcon !== undefined ? { currentIcon } : {}).then((icon) => {
      const config = loadDashboardConfig()
      const nextShortcuts = config.shortcuts.map((entry) => (entry.id === id ? { ...entry, icon } : entry))
      saveDashboardConfig({ ...config, shortcuts: nextShortcuts })
      setShortcuts(nextShortcuts)
      defaultEventBus.emit('shortcuts:changed', {})
    })
  }

  function editShortcut(id: string, input: ShortcutInput): ShortcutMutationResult {
    const result = updateShortcut(shortcuts, id, input)
    if (result.ok) {
      persist(result.shortcuts)
      const saved = result.shortcuts.find((entry) => entry.id === id)
      if (saved) {
        resolveAndPersistIcon(saved.id, saved.url, saved.label, saved.icon)
      }
    }
    return result
  }

  function deleteShortcut(id: string): ShortcutMutationResult {
    const result = removeShortcut(shortcuts, id)
    if (result.ok) {
      persist(result.shortcuts)
    }
    return result
  }

  return { shortcuts, categories, editShortcut, deleteShortcut }
}
