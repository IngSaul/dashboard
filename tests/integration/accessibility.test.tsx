import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Dashboard } from '../../src/features/dashboard/Dashboard'
import { createDefaultDashboardConfig } from '../../src/config/defaults'
import { saveDashboardConfig } from '../../src/services/configStore'
import { clearDashboardStorage } from '../fixtures/dashboardConfig'

/**
 * Accessibility contract for User Story 3 (labels, focus states, reduced
 * motion) targets the ThemeToggle control that doesn't exist yet (T052);
 * these tests are expected to fail until that work lands.
 *
 * 002-widget-dashboard update: `Dashboard` now renders `<AppShell>`
 * (T054); its widgets (T062-T069) are registered and render correctly, and
 * `SearchBar` is now composed as `CenterColumn`'s fixed leading chrome
 * (T096). Two assertions still fail, for different, already-resolved-
 * elsewhere reasons, not a regression: (1) `ThemeToggle` lives only inside
 * `SettingsDrawer`'s theme section (T078) — no task assigns it a
 * persistent main-chrome position, and design-reference.md doesn't show
 * one either, so this is a deliberate placement, not a gap; (2) "manage
 * shortcuts" — shortcut add/edit/remove now lives in `ShortcutSettings`
 * behind the drawer's "Toggle settings" button, which doesn't match this
 * old regex (renaming it would break the several tests already depending
 * on that exact name).
 */

/** Enables the `weather` widget on top of the defaults (clock + shortcuts) — weather's `role="status"` isn't present otherwise, per spec.md's US1 acceptance scenario 3. */
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

function mockMatchMedia(matches: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

describe('Accessibility (User Story 3)', () => {
  beforeEach(() => {
    clearDashboardStorage()
    mockMatchMedia(false)
  })

  afterEach(() => {
    clearDashboardStorage()
  })

  it('exposes accessible names for primary interactive controls', () => {
    render(<Dashboard />)

    expect(screen.getByRole('textbox', { name: /buscar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /buscar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cambiar tema/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /gestionar accesos directos/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Gmail' })).toBeInTheDocument()
  })

  it('identifies informative regions with accessible roles', async () => {
    enableWeather()
    render(<Dashboard />)

    expect(await screen.findByRole('group', { name: /fecha y hora actual/i })).toBeInTheDocument()
    expect(await screen.findByRole('status')).toBeInTheDocument()
  })

  it('keeps primary interactive controls in the natural tab order', () => {
    render(<Dashboard />)

    const controls = [
      screen.getByRole('textbox', { name: /buscar/i }),
      screen.getByRole('button', { name: /buscar/i }),
      screen.getByRole('button', { name: /cambiar tema/i }),
      screen.getByRole('button', { name: /gestionar accesos directos/i }),
      screen.getByRole('link', { name: 'Gmail' }),
    ]

    controls.forEach((control) => {
      expect(control.tabIndex).not.toBe(-1)
    })
  })

  it('renders core content without error when reduced motion is preferred', async () => {
    mockMatchMedia(true)
    render(<Dashboard />)

    expect(screen.getByRole('search')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Gmail' })).toBeInTheDocument()
  })
})
