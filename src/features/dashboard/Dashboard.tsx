import { useEffect, useState } from 'react'
import { DateTime } from '../../components/DateTime/DateTime'
import { SearchBar } from '../../components/SearchBar/SearchBar'
import { ShortcutCard } from '../../components/ShortcutCard/ShortcutCard'
import { StatusMessage } from '../../components/StatusMessage/StatusMessage'
import { WeatherSummary } from '../../components/WeatherSummary/WeatherSummary'
import { loadDashboardConfig, saveDashboardConfig } from '../../services/configStore'
import { fetchWeatherSummary } from '../../services/weather'
import type {
  DashboardConfiguration,
  WeatherSummary as WeatherSummaryData,
} from '../../types/dashboard'
import './Dashboard.css'

/**
 * Composes User Story 1: search, date/time, weather, and shortcut cards.
 * Loads the persisted (or default) configuration once and persists it back
 * so a first-launch or repaired configuration is saved; fetches weather
 * separately and non-blockingly so its loading/failure never delays or
 * breaks the rest of the dashboard (UI contract's launch/weather sections).
 */
export function Dashboard() {
  const [config] = useState<DashboardConfiguration>(() => loadDashboardConfig())
  const [weatherSummary, setWeatherSummary] = useState<WeatherSummaryData>({ status: 'loading' })

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

  return (
    <div className="dashboard">
      <h1 className="sr-only">Dashboard</h1>
      <header className="dashboard__header" aria-label="Status">
        <SearchBar searchPreference={config.searchPreference} />
        <DateTime />
        <WeatherSummary summary={weatherSummary} />
      </header>
      <main className="dashboard__main" aria-label="Shortcuts">
        {config.shortcuts.length === 0 ? (
          <StatusMessage message="No shortcuts yet." />
        ) : (
          config.shortcuts.map((shortcut) => (
            <ShortcutCard key={shortcut.id} shortcut={shortcut} />
          ))
        )}
      </main>
    </div>
  )
}
