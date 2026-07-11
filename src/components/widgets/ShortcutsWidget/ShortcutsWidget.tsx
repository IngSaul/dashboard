import { useEffect, useMemo, useState } from 'react'
import { CategoryNav } from '../../CategoryNav/CategoryNav'
import { ShortcutCard } from '../../ShortcutCard/ShortcutCard'
import { StatusMessage } from '../../StatusMessage/StatusMessage'
import { filterShortcutsByCategory, getNonEmptyCategories } from '../../../services/categories'
import { loadDashboardConfig } from '../../../services/configStore'
import { defaultEventBus } from '../../../services/eventBus'
import type { Shortcut, ShortcutCategory } from '../../../types/dashboard'
import './ShortcutsWidget.css'

/**
 * Read-only shortcuts grid: category filtering (existing `CategoryNav`) +
 * launch cards (existing `ShortcutCard`) per the UI contract's Shortcuts
 * Widget Boundary. Add/edit/remove/reorder happens through
 * `ShortcutSettings`/`SettingsDrawer` (T077), not here.
 *
 * Re-reads `configStore` on `eventBus`'s `shortcuts:changed` — shortcuts/
 * categories have no owning state slice (like `weatherPreference`), so
 * without this, an edit made in the settings drawer would only appear here
 * after a full reload, not immediately in the same session.
 */
export function ShortcutsWidget() {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
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

  const visibleCategories = useMemo(
    () => getNonEmptyCategories(categories, shortcuts),
    [categories, shortcuts],
  )
  const visibleShortcuts = useMemo(
    () => filterShortcutsByCategory(shortcuts, activeCategoryId),
    [shortcuts, activeCategoryId],
  )

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
            <ShortcutCard key={shortcut.id} shortcut={shortcut} />
          ))}
        </div>
      )}
    </div>
  )
}
