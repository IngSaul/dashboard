import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dashboard } from '../../src/features/dashboard/Dashboard'
import { clearDashboardStorage } from '../fixtures/dashboardConfig'

/**
 * Keyboard navigation for User Story 3 targets a ThemeToggle control that
 * doesn't exist yet (T052) and isn't wired into Dashboard yet (T053); these
 * tests define keyboard reachability/operability for search, categories,
 * shortcuts, theme, and settings (UI contract's Keyboard Navigation
 * section) and are expected to fail until that work lands.
 *
 * `tabUntil` presses Tab repeatedly until an element matching `predicate`
 * receives focus, rather than asserting one exact, brittle Tab sequence —
 * the real requirement is that every primary control is *somewhere* in a
 * reachable, logical tab order, not at a specific step count.
 *
 * 002-widget-dashboard update: `Dashboard` now renders `<AppShell>`
 * (T054), which has zero widgets until User Story 1's widget plugins
 * (specs/002-widget-dashboard/tasks.md T062-T071) are registered — these
 * tests are expected to stay red for that reason too until then.
 */

async function tabUntil(
  user: ReturnType<typeof userEvent.setup>,
  predicate: (element: Element) => boolean,
  maxSteps = 30,
): Promise<Element> {
  for (let step = 0; step < maxSteps; step += 1) {
    await user.tab()
    const active = document.activeElement
    if (active && predicate(active)) {
      return active
    }
  }
  throw new Error('Element not reached via Tab within maxSteps')
}

function mockLocationAssign(): ReturnType<typeof vi.fn> {
  const assignMock = vi.fn()
  Object.defineProperty(window, 'location', {
    value: { ...window.location, assign: assignMock },
    writable: true,
    configurable: true,
  })
  return assignMock
}

describe('Keyboard navigation (User Story 3)', () => {
  beforeEach(() => {
    clearDashboardStorage()
  })

  afterEach(() => {
    clearDashboardStorage()
  })

  it('submits a search using only the keyboard', async () => {
    const assignMock = mockLocationAssign()
    const user = userEvent.setup()
    render(<Dashboard />)

    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: /search/i }))
    await user.keyboard('react hooks{Enter}')

    expect(assignMock).toHaveBeenCalledTimes(1)
  })

  it('reaches and activates the theme toggle using only the keyboard', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)

    const before = document.documentElement.getAttribute('data-theme')
    await tabUntil(user, (el) => (el.getAttribute('aria-label') ?? '').includes('Toggle theme'))
    // The toggle cycles system -> light -> dark -> system; two activations
    // guarantee a resolved-theme change regardless of the starting mode.
    await user.keyboard('{Enter}')
    await user.keyboard('{Enter}')

    expect(document.documentElement.getAttribute('data-theme')).not.toBe(before)
  })

  it('reaches a category filter and a shortcut link using only the keyboard', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)

    const categoryButton = await tabUntil(user, (el) => el.textContent === 'General')
    await user.keyboard('{Enter}')
    expect(categoryButton.getAttribute('aria-pressed')).toBe('true')

    const shortcutLink = await tabUntil(user, (el) => el.textContent?.includes('Gmail') === true)
    expect(shortcutLink.tagName).toBe('A')
  })

  it('opens settings and reaches its fields using only the keyboard', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)

    await tabUntil(
      user,
      (el) => el.getAttribute('aria-pressed') !== null && el.textContent === 'Manage shortcuts',
    )
    await user.keyboard('{Enter}')

    const labelField = await tabUntil(user, (el) => el.tagName === 'INPUT')
    expect(labelField).toBe(screen.getByRole('textbox', { name: /label/i }))
  })
})
