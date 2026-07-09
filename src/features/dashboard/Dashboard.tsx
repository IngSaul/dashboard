import { useEffect, useState } from 'react'
import { loadDashboardConfig, saveDashboardConfig } from '../../services/configStore'
import type { DashboardConfiguration } from '../../types/dashboard'
import './Dashboard.css'

/**
 * Foundational composition shell: loads the persisted configuration (or
 * defaults) once, persists it back so a first-launch or repaired
 * configuration is saved, and exposes the structural regions that user
 * story components (search, weather, date/time, shortcuts) compose into.
 */
export function Dashboard() {
  const [config] = useState<DashboardConfiguration>(() => loadDashboardConfig())

  useEffect(() => {
    saveDashboardConfig(config)
  }, [config])

  return (
    <div className="dashboard">
      <h1 className="sr-only">Dashboard</h1>
      <header className="dashboard__header" aria-label="Status"></header>
      <main className="dashboard__main" aria-label="Shortcuts"></main>
    </div>
  )
}
