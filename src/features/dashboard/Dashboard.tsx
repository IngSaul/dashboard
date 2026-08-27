import { AppShell } from '../../components/shell/AppShell/AppShell'

/**
 * Renders `AppShell`, the single top-level composition root for the
 * glassmorphism widget dashboard (002-widget-dashboard) — replaces this
 * feature's previous fixed-section layout (search/date/weather/shortcuts
 * composed directly here). That functionality now lives behind registered
 * widgets (`src/plugins/`) rendered by `AppShell`'s `Workspace`.
 *
 * 003-auth-persistence: the auth gate (`AuthProvider`/`AuthGate`) wraps
 * `Dashboard` one level up, in `App.tsx` — not here — specifically so tests
 * that render `<Dashboard/>` directly (there are ~11 of them) keep working
 * unchanged, exercising `AppShell` without needing a session. Production
 * behavior is identical either way, since `main.tsx` always renders `<App/>`.
 */
export function Dashboard() {
  return <AppShell />
}
