import { useEffect, useState } from 'react'
import { WeatherSummary } from '../../WeatherSummary/WeatherSummary'
import { loadDashboardConfig } from '../../../services/configStore'
import { fetchWeatherSummary } from '../../../services/weather'
import type { WeatherSummary as WeatherSummaryData } from '../../../types/dashboard'

/**
 * Wraps the existing `WeatherSummary` presentational component with its own
 * fetch lifecycle (`loading` -> `ready`/`unavailable`), independent of every
 * other widget (UI contract's Per-Widget Contract). Reads
 * `weatherPreference` directly from `configStore` — a feature-001 field
 * with no owning 002 state slice (only `ThemePreferences`/`WidgetLayout`/
 * `MonitoringSourceConfig`/`Note` are slice-owned).
 */
export function WeatherWidget() {
  const [summary, setSummary] = useState<WeatherSummaryData>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    const preference = loadDashboardConfig().weatherPreference
    void fetchWeatherSummary(preference).then((result) => {
      if (!cancelled) {
        setSummary(result)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  return <WeatherSummary summary={summary} />
}
