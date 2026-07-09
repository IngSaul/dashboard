import { useEffect, useMemo, useRef, useState } from 'react'
import { CategoryNav } from '../../components/CategoryNav/CategoryNav'
import { DateTime } from '../../components/DateTime/DateTime'
import { SearchBar } from '../../components/SearchBar/SearchBar'
import { Settings } from '../../components/Settings/Settings'
import { ShortcutCard } from '../../components/ShortcutCard/ShortcutCard'
import { StatusMessage } from '../../components/StatusMessage/StatusMessage'
import { ThemeToggle } from '../../components/ThemeToggle/ThemeToggle'
import { WeatherSummary } from '../../components/WeatherSummary/WeatherSummary'
import {
  addCategory,
  filterShortcutsByCategory,
  getNonEmptyCategories,
  type CategoryInput,
  type CategoryMutationResult,
} from '../../services/categories'
import { loadDashboardConfig, saveDashboardConfig } from '../../services/configStore'
import {
  addShortcut,
  removeShortcut,
  reorderShortcuts,
  updateShortcut,
  type ShortcutInput,
  type ShortcutMutationResult,
} from '../../services/shortcuts'
import {
  applyResolvedTheme,
  createThemePreference,
  getSystemPrefersDark,
} from '../../services/theme'
import { fetchWeatherSummary } from '../../services/weather'
import type {
  DashboardConfiguration,
  Shortcut,
  ThemeMode,
  WeatherSummary as WeatherSummaryData,
} from '../../types/dashboard'
import './Dashboard.css'

/**
 * Composes User Story 1 (search, date/time, weather, shortcuts), User
 * Story 2 (category filtering, add/edit/remove shortcuts), and User Story 3
 * (theme). Theme, like shortcuts/categories, persists through the same
 * `saveDashboardConfig` effect used for first-launch defaults.
 */
export function Dashboard() {
  const [config, setConfig] = useState<DashboardConfiguration>(() => {
    const loaded = loadDashboardConfig()
    if (loaded.themePreference.mode !== 'system') {
      return loaded
    }
    // Persisted/default `resolvedMode` may be stale relative to the
    // browser's current preference; reconcile once on load.
    return {
      ...loaded,
      themePreference: createThemePreference('system', getSystemPrefersDark()),
    }
  })
  const [weatherSummary, setWeatherSummary] = useState<WeatherSummaryData>({ status: 'loading' })
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [isManaging, setIsManaging] = useState(false)
  const [editingShortcutId, setEditingShortcutId] = useState<string | null>(null)
  const manageToggleRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    saveDashboardConfig(config)
  }, [config])

  useEffect(() => {
    applyResolvedTheme(config.themePreference.resolvedMode)
  }, [config.themePreference.resolvedMode])

  useEffect(() => {
    let cancelled = false
    void fetchWeatherSummary(config.weatherPreference).then((summary) => {
      if (!cancelled) {
        setWeatherSummary(summary)
      }
    })
    return () => {
      cancelled = true
    }
  }, [config.weatherPreference])

  const visibleCategories = useMemo(
    () => getNonEmptyCategories(config.categories, config.shortcuts),
    [config.categories, config.shortcuts],
  )
  const visibleShortcuts = useMemo(
    () => filterShortcutsByCategory(config.shortcuts, activeCategoryId),
    [config.shortcuts, activeCategoryId],
  )
  const editingShortcut = config.shortcuts.find((s) => s.id === editingShortcutId) ?? null

  function handleAddCategory(input: CategoryInput): CategoryMutationResult {
    const result = addCategory(config.categories, input)
    if (result.ok) {
      setConfig((previous) => ({ ...previous, categories: result.categories }))
    }
    return result
  }

  function handleThemeChange(mode: ThemeMode) {
    setConfig((previous) => ({
      ...previous,
      themePreference: createThemePreference(mode, getSystemPrefersDark()),
    }))
  }

  function handleSubmitShortcut(input: ShortcutInput): ShortcutMutationResult {
    const result = editingShortcutId
      ? updateShortcut(config.shortcuts, editingShortcutId, input)
      : addShortcut(config.shortcuts, input)
    if (result.ok) {
      setConfig((previous) => ({ ...previous, shortcuts: result.shortcuts }))
      setEditingShortcutId(null)
    }
    return result
  }

  function handleRemoveShortcut(shortcut: Shortcut) {
    const result = removeShortcut(config.shortcuts, shortcut.id)
    if (result.ok) {
      setConfig((previous) => ({ ...previous, shortcuts: result.shortcuts }))
      if (editingShortcutId === shortcut.id) {
        setEditingShortcutId(null)
      }
      // The removed card's own "Remove" button had focus; without this it
      // would be lost to <body>, disorienting keyboard/screen-reader users.
      manageToggleRef.current?.focus()
    }
  }

  /**
   * Swaps `shortcut` with its neighbor in the currently visible (possibly
   * category-filtered) order, applying that swap to the full shortcut list
   * via the same permutation-based `reorderShortcuts` used in T036's tests.
   */
  function handleMoveShortcut(shortcut: Shortcut, direction: 'up' | 'down') {
    const visibleIds = visibleShortcuts.map((s) => s.id)
    const visibleIndex = visibleIds.indexOf(shortcut.id)
    const neighborIndex = direction === 'up' ? visibleIndex - 1 : visibleIndex + 1
    const neighborId = visibleIds[neighborIndex]
    if (neighborId === undefined) {
      return
    }
    const fullIds = config.shortcuts.map((s) => s.id)
    const a = fullIds.indexOf(shortcut.id)
    const b = fullIds.indexOf(neighborId)
    const nextIds = fullIds.map((id, index) => {
      if (index === a) return neighborId
      if (index === b) return shortcut.id
      return id
    })
    const result = reorderShortcuts(config.shortcuts, nextIds)
    if (result.ok) {
      setConfig((previous) => ({ ...previous, shortcuts: result.shortcuts }))
    }
  }

  return (
    <div className="dashboard">
      <h1 className="sr-only">Dashboard</h1>
      <header className="dashboard__header" aria-label="Status">
        <SearchBar searchPreference={config.searchPreference} />
        <DateTime />
        <WeatherSummary summary={weatherSummary} />
        <ThemeToggle mode={config.themePreference.mode} onChange={handleThemeChange} />
        <button
          ref={manageToggleRef}
          type="button"
          className="dashboard__manage-toggle"
          aria-pressed={isManaging}
          onClick={() => {
            setIsManaging((value) => !value)
            setEditingShortcutId(null)
          }}
        >
          Manage shortcuts
        </button>
      </header>

      <CategoryNav
        categories={visibleCategories}
        activeCategoryId={activeCategoryId}
        onSelectCategory={setActiveCategoryId}
      />

      {isManaging ? (
        <Settings
          key={editingShortcut?.id ?? 'new'}
          categories={config.categories}
          editingShortcut={editingShortcut}
          onSubmit={handleSubmitShortcut}
          onCancelEdit={() => setEditingShortcutId(null)}
          onAddCategory={handleAddCategory}
        />
      ) : null}

      <main className="dashboard__main" aria-label="Shortcuts">
        {visibleShortcuts.length === 0 ? (
          <StatusMessage message="No shortcuts yet." />
        ) : (
          visibleShortcuts.map((shortcut, index) => (
            <ShortcutCard
              key={shortcut.id}
              shortcut={shortcut}
              editable={isManaging}
              canMoveUp={index > 0}
              canMoveDown={index < visibleShortcuts.length - 1}
              onEdit={(s) => setEditingShortcutId(s.id)}
              onRemove={handleRemoveShortcut}
              onMoveUp={(s) => handleMoveShortcut(s, 'up')}
              onMoveDown={(s) => handleMoveShortcut(s, 'down')}
            />
          ))
        )}
      </main>
    </div>
  )
}
