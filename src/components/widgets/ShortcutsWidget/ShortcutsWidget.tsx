import { useMemo, useState } from 'react'
import { CategoryNav } from '../../CategoryNav/CategoryNav'
import { ShortcutCard } from '../../ShortcutCard/ShortcutCard'
import { StatusMessage } from '../../StatusMessage/StatusMessage'
import { filterShortcutsByCategory, getNonEmptyCategories } from '../../../services/categories'
import { loadDashboardConfig } from '../../../services/configStore'
import './ShortcutsWidget.css'

/**
 * Read-only shortcuts grid: category filtering (existing `CategoryNav`) +
 * launch cards (existing `ShortcutCard`, non-editable) per the UI
 * contract's Shortcuts Widget Boundary. Add/edit/remove happens through
 * `WidgetSettings`/`SettingsDrawer` (T076-T077), not here — icon
 * resolution comes in User Story 3, so cards show name/description only
 * until then. Synchronous/local — no loading state.
 */
export function ShortcutsWidget() {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const config = useMemo(() => loadDashboardConfig(), [])

  const visibleCategories = useMemo(
    () => getNonEmptyCategories(config.categories, config.shortcuts),
    [config.categories, config.shortcuts],
  )
  const visibleShortcuts = useMemo(
    () => filterShortcutsByCategory(config.shortcuts, activeCategoryId),
    [config.shortcuts, activeCategoryId],
  )

  return (
    <div className="shortcuts-widget">
      <CategoryNav
        categories={visibleCategories}
        activeCategoryId={activeCategoryId}
        onSelectCategory={setActiveCategoryId}
      />
      {visibleShortcuts.length === 0 ? (
        <StatusMessage message="No shortcuts yet." />
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
