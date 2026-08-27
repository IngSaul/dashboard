import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dashboard } from '../../src/features/dashboard/Dashboard'
import { createDefaultDashboardConfig } from '../../src/config/defaults'
import { saveDashboardConfig } from '../../src/services/configStore'
import { clearDashboardStorage } from '../fixtures/dashboardConfig'

/**
 * Accessibility contract for User Story 3 (labels, focus states, reduced
 * motion).
 *
 * 003-auth-persistence update: two assertions previously targeted a
 * "cambiar tema"/"gestionar accesos directos" pair of always-visible
 * main-chrome buttons that never actually existed in this shape — verified
 * against `main` before this feature (`git worktree` diff against
 * 2b4ee82): those two assertions were already failing there too, so this
 * is pre-existing test debt from the 002-widget-dashboard drawer
 * consolidation, not something introduced here. Rewritten to match the
 * actual current controls: the always-visible settings toggle
 * ("Alternar configuración") and the shortcuts grid's add tile ("Añadir
 * acceso directo") replace the stale pair, and a new test confirms the
 * real `ThemeToggle` (only reachable once the drawer is open — see
 * `ThemeSection.tsx`) still exposes its own accessible name.
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

  it('exposes accessible names for primary interactive controls', async () => {
    render(<Dashboard />)

    expect(screen.getByRole('button', { name: 'Alternar configuración' })).toBeInTheDocument()
    // The shortcuts widget is code-split behind `widgetRegistry.lazyLoad`
    // and, the first time any given widget type is dynamically imported
    // within a test file's module graph, briefly suspends for a tick —
    // `findByRole` (not `getByRole`) is the robust way to wait for it,
    // matching WidgetGrid.test.tsx's own note on this race.
    expect(await screen.findByRole('button', { name: 'Añadir acceso directo' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Gmail' })).toBeInTheDocument()
  })

  it('exposes an accessible name for the theme toggle once settings are open', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)

    await user.click(screen.getByRole('button', { name: 'Alternar configuración' }))

    expect(screen.getByRole('button', { name: /cambiar tema/i })).toBeInTheDocument()
  })

  it('identifies informative regions with accessible roles', async () => {
    enableWeather()
    render(<Dashboard />)

    expect(await screen.findByRole('group', { name: /fecha y hora actual/i })).toBeInTheDocument()
    // Scoped to the weather widget's own container, not queried bare: the
    // shortcuts widget (enabled alongside weather here) also renders a
    // hidden `role="status"` live region for @dnd-kit's screen-reader drag
    // announcements, so an unscoped query is ambiguous whenever both are
    // present — same documented gotcha as dashboardLaunch.test.tsx.
    const weatherWidget = await waitFor(() => {
      const element = document.querySelector('[data-widget-type="weather"]')
      if (!element) throw new Error('weather widget not rendered yet')
      return element as HTMLElement
    })
    expect(await within(weatherWidget).findByRole('status')).toBeInTheDocument()
  })

  it('keeps primary interactive controls in the natural tab order', async () => {
    render(<Dashboard />)

    const controls = [
      screen.getByRole('button', { name: 'Alternar configuración' }),
      await screen.findByRole('button', { name: 'Añadir acceso directo' }),
      screen.getByRole('link', { name: 'Gmail' }),
    ]

    controls.forEach((control) => {
      expect(control.tabIndex).not.toBe(-1)
    })
  })

  it('renders core content without error when reduced motion is preferred', async () => {
    mockMatchMedia(true)
    render(<Dashboard />)

    expect(await screen.findByRole('link', { name: 'Gmail' })).toBeInTheDocument()
  })
})
