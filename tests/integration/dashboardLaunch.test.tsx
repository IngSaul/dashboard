import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Dashboard } from '../../src/features/dashboard/Dashboard'
import { createDefaultDashboardConfig } from '../../src/config/defaults'
import { saveDashboardConfig } from '../../src/services/configStore'
import { clearDashboardStorage } from '../fixtures/dashboardConfig'

/**
 * Composed User Story 1 behavior (date/time, weather, shortcuts) defines
 * the launch contract from `contracts/ui-contract.md`.
 *
 * Default shortcuts/weather come from `createDefaultDashboardConfig`
 * (T010): Gmail/Calendar/YouTube/GitHub shortcuts, weather enabled via
 * browser location. jsdom has no `navigator.geolocation`, so the weather
 * service is expected to resolve to an `unavailable` status without making
 * a network request, keeping this test fast and offline-safe.
 *
 * 002-widget-dashboard update: `Dashboard` now renders `<AppShell>`
 * (T054). `SearchBar` was removed: a plain web page has no way to focus or
 * write into the browser's own address bar, so an in-app search box could
 * only mimic — not proxy — the browser's real omnibox and default search
 * engine (see the SearchBar-removal note in CenterColumn.tsx).
 * Widget lookups here use `findByRole` rather than `getByRole`: every
 * widget is code-split behind `widgetRegistry.lazyLoad` (a hard UI-
 * contract rule), so it briefly suspends for one microtask tick on first
 * mount — invisible in a real browser, but a synchronous query can race
 * it in a test.
 *
 * Weather is no longer enabled by default: `WidgetLayout`'s defaults only
 * enable `clock`/`shortcuts` (spec.md's US1 acceptance scenario 3 — "only
 * the default widgets: clock + shortcuts"), so a test wanting to see the
 * weather widget's status must enable it explicitly, via `enableWeather()`
 * below (same helper shape as `WidgetGrid.test.tsx`'s).
 */

/** Enables the `weather` widget on top of the defaults (clock + shortcuts). */
function enableWeather(): void {
  const config = createDefaultDashboardConfig()
  config.widgetLayout = {
    ...config.widgetLayout,
    widgets: config.widgetLayout.widgets.map((widget) =>
      widget.type === 'weather' ? { ...widget, enabled: true } : widget,
    ),
  }
  saveDashboardConfig(config)
}

describe('Dashboard launch (User Story 1)', () => {
  beforeEach(() => {
    clearDashboardStorage()
  })

  afterEach(() => {
    clearDashboardStorage()
  })

  it('shows date/time, weather status, and shortcut cards on load', async () => {
    enableWeather()
    render(<Dashboard />)

    expect(await screen.findByRole('group', { name: /fecha y hora actual/i })).toBeInTheDocument()
    expect(await screen.findByRole('status')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Gmail' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'GitHub' })).toBeInTheDocument()
  })

  it('keeps date/time and shortcuts usable when weather is unavailable', async () => {
    enableWeather()
    render(<Dashboard />)

    const status = await screen.findByRole('status')
    expect(status).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Gmail' })).toBeInTheDocument()
  })
})
