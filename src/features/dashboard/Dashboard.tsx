import { useEffect, useMemo, useState } from 'react'
import { CategoryNav } from '../../components/CategoryNav/CategoryNav'
import { DateTime } from '../../components/DateTime/DateTime'
import { SearchBar } from '../../components/SearchBar/SearchBar'
import { Settings } from '../../components/Settings/Settings'
import { ShortcutCard } from '../../components/ShortcutCard/ShortcutCard'
import { StatusMessage } from '../../components/StatusMessage/StatusMessage'
import { WeatherSummary } from '../../components/WeatherSummary/WeatherSummary'
import { filterShortcutsByCategory, getNonEmptyCategories } from '../../services/categories'
import { loadDashboardConfig, saveDashboardConfig } from '../../services/configStore'
import {
  addShortcut,
  removeShortcut,
  updateShortcut,
  type ShortcutInput,
  type ShortcutMutationResult,
} from '../../services/shortcuts'
import { fetchWeatherSummary } from '../../services/weather'
import type {
  DashboardConfiguration,
  Shortcut,
  WeatherSummary as WeatherSummaryData,
} from '../../types/dashboard'
import './Dashboard.css'

/**
 * Composes User Story 1 (search, date/time, weather, shortcuts) and User
 * Story 2 (category filtering, add/edit/remove shortcuts, persisted via
 * the same `saveDashboardConfig` effect used for first-launch defaults).
 */
export function Dashboard() {
  const [config, setConfig] = useState<DashboardConfiguration>(() => loadDashboardConfig())
  const [weatherSummary, setWeatherSummary] = useState<WeatherSummaryData>({ status: 'loading' })
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)
  const [isManaging, setIsManaging] = useState(false)
  const [editingShortcutId, setEditingShortcutId] = useState<string | null>(null)

  useEffect(() => {
    saveDashboardConfig(config)
  }, [config])

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
    }
  }

  return (
    <div className="dashboard">
      <h1 className="sr-only">Dashboard</h1>
      <header className="dashboard__header" aria-label="Status">
        <SearchBar searchPreference={config.searchPreference} />
        <DateTime />
        <WeatherSummary summary={weatherSummary} />
        <button
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
        />
      ) : null}

      <main className="dashboard__main" aria-label="Shortcuts">
        {visibleShortcuts.length === 0 ? (
          <StatusMessage message="No shortcuts yet." />
        ) : (
          visibleShortcuts.map((shortcut) => (
            <ShortcutCard
              key={shortcut.id}
              shortcut={shortcut}
              editable={isManaging}
              onEdit={(s) => setEditingShortcutId(s.id)}
              onRemove={handleRemoveShortcut}
            />
          ))
        )}
      </main>
    </div>
  )
}
