import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Dashboard } from '../../src/features/dashboard/Dashboard'
import { clearDashboardStorage } from '../fixtures/dashboardConfig'

/**
 * Accessibility contract for User Story 3 (labels, focus states, reduced
 * motion) targets the ThemeToggle control that doesn't exist yet (T052);
 * these tests are expected to fail until that work lands.
 *
 * 002-widget-dashboard update: `Dashboard` now renders `<AppShell>`
 * (T054); its widgets (T062-T069) are registered and render correctly, but
 * `ThemeToggle` and the standalone `SearchBar` are not composed anywhere in
 * `AppShell` yet — no task in tasks.md currently assigns either's
 * placement (T078 only extends `ThemeToggle`'s own behavior, assuming a
 * mount point already exists). Flagging for a future task/spec pass.
 */

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

    expect(screen.getByRole('textbox', { name: /search/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /toggle theme/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /manage shortcuts/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Gmail' })).toBeInTheDocument()
  })

  it('identifies informative regions with accessible roles', async () => {
    render(<Dashboard />)

    expect(screen.getByRole('group', { name: /current date and time/i })).toBeInTheDocument()
    expect(await screen.findByRole('status')).toBeInTheDocument()
  })

  it('keeps primary interactive controls in the natural tab order', () => {
    render(<Dashboard />)

    const controls = [
      screen.getByRole('textbox', { name: /search/i }),
      screen.getByRole('button', { name: /search/i }),
      screen.getByRole('button', { name: /toggle theme/i }),
      screen.getByRole('button', { name: /manage shortcuts/i }),
      screen.getByRole('link', { name: 'Gmail' }),
    ]

    controls.forEach((control) => {
      expect(control.tabIndex).not.toBe(-1)
    })
  })

  it('renders core content without error when reduced motion is preferred', () => {
    mockMatchMedia(true)
    render(<Dashboard />)

    expect(screen.getByRole('search')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Gmail' })).toBeInTheDocument()
  })
})
