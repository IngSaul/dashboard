import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dashboard } from '../../src/features/dashboard/Dashboard'
import { createDefaultDashboardConfig } from '../../src/config/defaults'
import { saveDashboardConfig } from '../../src/services/configStore'
import { clearDashboardStorage } from '../fixtures/dashboardConfig'

/**
 * Composed User Story 1 behavior (search, date/time, weather, shortcuts)
 * does not exist on `Dashboard` yet (built across T026-T032); these tests
 * define the launch contract from `contracts/ui-contract.md` and are
 * expected to fail until that composition work lands.
 *
 * Default shortcuts/weather come from `createDefaultDashboardConfig`
 * (T010): Gmail/Calendar/YouTube/GitHub shortcuts, weather enabled via
 * browser location. jsdom has no `navigator.geolocation`, so the weather
 * service is expected to resolve to an `unavailable` status without making
 * a network request, keeping this test fast and offline-safe.
 *
 * 002-widget-dashboard update: `Dashboard` now renders `<AppShell>`
 * (T054); `SearchBar` is now composed as `CenterColumn`'s fixed leading
 * chrome (T096), closing the placement gap this docstring used to flag.
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

function mockLocationAssign(): ReturnType<typeof vi.fn> {
  const assignMock = vi.fn()
  Object.defineProperty(window, 'location', {
    value: { ...window.location, assign: assignMock },
    writable: true,
    configurable: true,
  })
  return assignMock
}

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

  it('shows search, date/time, weather status, and shortcut cards on load', async () => {
    enableWeather()
    render(<Dashboard />)

    expect(screen.getByRole('search')).toBeInTheDocument()
    expect(await screen.findByRole('group', { name: /current date and time/i })).toBeInTheDocument()
    expect(await screen.findByRole('status')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Gmail' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'GitHub' })).toBeInTheDocument()
  })

  it('submits a non-empty search query to the configured destination', async () => {
    const assignMock = mockLocationAssign()
    const user = userEvent.setup()

    render(<Dashboard />)
    await user.type(screen.getByRole('textbox', { name: /search/i }), 'react hooks')
    await user.click(screen.getByRole('button', { name: /search/i }))

    expect(assignMock).toHaveBeenCalledTimes(1)
    expect(String(assignMock.mock.calls[0]?.[0])).toContain(encodeURIComponent('react hooks'))
  })

  it('ignores an empty search submission without navigating', async () => {
    const assignMock = mockLocationAssign()
    const user = userEvent.setup()

    render(<Dashboard />)
    await user.click(screen.getByRole('button', { name: /search/i }))

    expect(assignMock).not.toHaveBeenCalled()
  })

  it('keeps search, date/time, and shortcuts usable when weather is unavailable', async () => {
    enableWeather()
    render(<Dashboard />)

    const status = await screen.findByRole('status')
    expect(status).toBeInTheDocument()
    expect(screen.getByRole('search')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Gmail' })).toBeInTheDocument()
  })
})
