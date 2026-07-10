import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, waitFor, within } from '@testing-library/react'
import { Dashboard } from '../../src/features/dashboard/Dashboard'
import { createDefaultDashboardConfig } from '../../src/config/defaults'
import { saveDashboardConfig } from '../../src/services/configStore'
import { clearDashboardStorage } from '../fixtures/dashboardConfig'
import type { WidgetType } from '../../src/types/widgets'

/**
 * WidgetGrid contract for User Story 1 — spec.md's acceptance scenarios 1
 * and 3, and quickstart.md's Scenario 1. No widget plugins are registered
 * yet (`registerBuiltInPlugins()` is an empty stub until T069), so
 * `Workspace` currently renders zero widgets regardless of what's enabled
 * in the persisted `WidgetLayout` (see `layoutEngine.resolveLayout`, which
 * only shows enabled widgets whose type is also registered) — these tests
 * are expected to fail until T062-T071 land.
 *
 * Widgets are located by the stable `data-widget-type` attribute
 * `WidgetSlot` sets on every rendered widget's `GlassCard` — not by display
 * name text, which these tests don't need to guess ahead of the plugins
 * that define it.
 */

function widgetSlot(type: WidgetType): HTMLElement | null {
  return document.querySelector(`.widget-slot[data-widget-type="${type}"]`)
}

/** Enables the `weather` widget on top of the defaults (clock + shortcuts), to exercise a network-dependent widget's loading -> settled transition. */
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

describe('WidgetGrid (User Story 1)', () => {
  beforeEach(() => {
    clearDashboardStorage()
  })

  afterEach(() => {
    clearDashboardStorage()
  })

  describe('default load (spec.md acceptance scenario 1, quickstart.md Scenario 1)', () => {
    beforeEach(() => {
      enableWeather()
    })

    it('renders clock and shortcuts immediately, with no lingering loading state', async () => {
      render(<Dashboard />)

      const clock = widgetSlot('clock')
      const shortcuts = widgetSlot('shortcuts')
      expect(clock).not.toBeNull()
      expect(shortcuts).not.toBeNull()

      // `WidgetSlot` code-splits every widget type via `widgetRegistry.lazyLoad`
      // (a hard UI-contract rule — Workspace must never bypass the registry,
      // even for guaranteed-default widgets), so even a purely local/
      // synchronous widget briefly suspends for one microtask tick — real,
      // but imperceptible in a browser (it resolves before the next paint).
      // `waitFor` lets that tick flush; it is not waiting on any network
      // request, unlike the `weather` case below.
      await waitFor(() => {
        expect(within(clock as HTMLElement).queryByRole('status')).toBeNull()
        expect(within(shortcuts as HTMLElement).queryByRole('status')).toBeNull()
      })
    })

    it('shows a loading state for an enabled network-dependent widget, then settles to unavailable — never a blank gap', async () => {
      render(<Dashboard />)

      const weather = widgetSlot('weather')
      expect(weather).not.toBeNull()
      // Something is always shown immediately — loading, then a settled state — never a blank gap.
      expect(within(weather as HTMLElement).getByRole('status')).toBeInTheDocument()

      // jsdom has no `navigator.geolocation`, so this settles to `unavailable`
      // without making a network request (matches dashboardLaunch.test.tsx's
      // existing weather precedent).
      await within(weather as HTMLElement).findByText(/unavailable/i)
    })
  })

  describe('zero optional widgets enabled (spec.md acceptance scenario 3)', () => {
    it('renders only the default widgets (clock + shortcuts), no others', () => {
      render(<Dashboard />)

      expect(widgetSlot('clock')).not.toBeNull()
      expect(widgetSlot('shortcuts')).not.toBeNull()
      const disabledByDefault: WidgetType[] = [
        'weather',
        'server-status',
        'docker-status',
        'calendar',
        'notes',
      ]
      for (const type of disabledByDefault) {
        expect(widgetSlot(type)).toBeNull()
      }
    })

    it('leaves the left and right columns empty rather than rendering an empty widget card (no layout artifacts)', () => {
      render(<Dashboard />)

      const left = document.querySelector('.workspace-column--left')
      const right = document.querySelector('.workspace-column--right')
      expect(left?.querySelectorAll('.widget-slot')).toHaveLength(0)
      expect(right?.querySelectorAll('.widget-slot')).toHaveLength(0)
    })
  })
})
