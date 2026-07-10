import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, render, renderHook, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { Dashboard } from '../../src/features/dashboard/Dashboard'
import { ThemeProvider, useThemeState } from '../../src/state/ThemeProvider'
import { clearDashboardStorage } from '../fixtures/dashboardConfig'

/**
 * `WidgetSettings` (T076) does not exist yet, and isn't composed inside
 * `SettingsDrawer` until T077 — these UI-driven tests are expected to fail
 * to resolve/find elements until both land. Contract committed to here
 * (to be matched when building T076/T077), scoped inside
 * `.settings-drawer__body`:
 *   - One row per registered widget type, in `WIDGET_CATALOG` order.
 *   - A `checkbox` accessibly named after the widget's `displayName`
 *     (e.g. "Weather"), checked/unchecked matching `WidgetLayout`'s
 *     current `enabled` state for that type, toggling it via
 *     `WorkspaceState.setWidgetEnabled`.
 *   - "Move {displayName} up"/"Move {displayName} down" buttons (mirrors
 *     `ShortcutCard`'s existing `Move {label} up`/`down` convention),
 *     calling `WorkspaceState.moveWidgetInColumn`.
 *
 * T074 (theme-group switch) is tested separately below, directly against
 * `ThemeProvider`/`useThemeState()` rather than through a UI control: no
 * task before T077-T081 gives glass intensity a UI, and — more
 * fundamentally — `GlassPanel.css` today hardcodes
 * `--glass-fill-medium`/`--glass-blur-medium` unconditionally, so nothing
 * yet reads `ThemeState.glass` into actual rendered CSS output either.
 * That visual wiring is a real gap for whichever task builds the six
 * theme-group sections to close; this test only defines the state-level
 * contract (switching the group updates `ThemeState` consistently and
 * persists), not the not-yet-existing visual output.
 */

function widgetCheckbox(name: string): HTMLElement {
  return within(document.querySelector('.settings-drawer__body') as HTMLElement).getByRole('checkbox', {
    name,
  })
}

async function openSettings(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Toggle settings' }))
}

describe('WidgetSettings (User Story 2)', () => {
  beforeEach(() => {
    clearDashboardStorage()
  })

  afterEach(() => {
    clearDashboardStorage()
  })

  describe('enable/disable/reorder controls (T073)', () => {
    it('lists a checkbox per registered widget type, reflecting current enabled state', async () => {
      const user = userEvent.setup()
      render(<Dashboard />)

      await openSettings(user)

      expect(widgetCheckbox('Clock')).toBeChecked()
      expect(widgetCheckbox('Shortcuts')).toBeChecked()
      expect(widgetCheckbox('Weather')).not.toBeChecked()
    })

    it('enabling a widget via its checkbox makes it render on the dashboard', async () => {
      const user = userEvent.setup()
      render(<Dashboard />)

      await openSettings(user)
      await user.click(widgetCheckbox('Weather'))

      expect(document.querySelector('.widget-slot[data-widget-type="weather"]')).not.toBeNull()
    })

    it('disabling a widget via its checkbox removes it from the dashboard', async () => {
      const user = userEvent.setup()
      render(<Dashboard />)

      await openSettings(user)
      await user.click(widgetCheckbox('Shortcuts'))

      expect(document.querySelector('.widget-slot[data-widget-type="shortcuts"]')).toBeNull()
      // The never-fully-empty guarantee means clock alone is enough to satisfy it.
      expect(document.querySelector('.widget-slot[data-widget-type="clock"]')).not.toBeNull()
    })

    it('reordering via move up/down updates the widgets’ order on the dashboard', async () => {
      const user = userEvent.setup()
      render(<Dashboard />)

      await openSettings(user)
      const settingsBody = document.querySelector('.settings-drawer__body') as HTMLElement
      await user.click(within(settingsBody).getByRole('button', { name: 'Move Shortcuts up' }))

      const center = document.querySelector('.workspace-column--center') as HTMLElement
      const slots = Array.from(center.querySelectorAll('.widget-slot')).map((slot) =>
        slot.getAttribute('data-widget-type'),
      )
      expect(slots).toEqual(['shortcuts', 'clock'])
    })

    it('persists an enable/disable change across a reload', async () => {
      const user = userEvent.setup()
      const { unmount } = render(<Dashboard />)

      await openSettings(user)
      await user.click(widgetCheckbox('Weather'))
      unmount()

      render(<Dashboard />)

      expect(document.querySelector('.widget-slot[data-widget-type="weather"]')).not.toBeNull()
    })
  })

  describe('ThemePreferences group switch (T074)', () => {
    function wrapper({ children }: { children: ReactNode }) {
      return <ThemeProvider>{children}</ThemeProvider>
    }

    it('switching the glass intensity group updates ThemeState consistently and persists', () => {
      const { result, rerender } = renderHook(() => useThemeState(), { wrapper })

      expect(result.current.glass.intensity).toBe('medium')

      act(() => {
        result.current.setGlass({ intensity: 'high', borderStrength: 'visible' })
      })

      expect(result.current.glass).toEqual({ intensity: 'high', borderStrength: 'visible' })

      // A fresh mount (simulating reload) reads the persisted value back.
      rerender()
      const { result: reloaded } = renderHook(() => useThemeState(), { wrapper })
      expect(reloaded.current.glass).toEqual({ intensity: 'high', borderStrength: 'visible' })
    })

    it('switching one group leaves the other five untouched', () => {
      const { result } = renderHook(() => useThemeState(), { wrapper })
      const { animations, accessibility, appearance } = result.current

      act(() => {
        result.current.setGlass({ intensity: 'low', borderStrength: 'visible' })
      })

      expect(result.current.animations).toEqual(animations)
      expect(result.current.accessibility).toEqual(accessibility)
      expect(result.current.appearance).toEqual(appearance)
    })
  })
})
