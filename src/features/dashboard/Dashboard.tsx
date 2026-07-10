import { AppShell } from '../../components/shell/AppShell/AppShell'

/**
 * Renders `AppShell`, the single top-level composition root for the
 * glassmorphism widget dashboard (002-widget-dashboard) — replaces this
 * feature's previous fixed-section layout (search/date/weather/shortcuts
 * composed directly here). That functionality now lives behind registered
 * widgets (`src/plugins/`) rendered by `AppShell`'s `Workspace`.
 */
export function Dashboard() {
  return <AppShell />
}
