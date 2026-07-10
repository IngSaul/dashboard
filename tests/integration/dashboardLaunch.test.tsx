import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dashboard } from '../../src/features/dashboard/Dashboard'
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
 * (T054). Widgets (clock/weather/shortcuts/etc., T062-T069) are registered
 * and render correctly as of T069, but this file's search-bar assertions
 * still fail — no task in tasks.md currently composes the standalone
 * `SearchBar` chrome (as opposed to `CommandPalette`) anywhere in
 * `AppShell`/`Workspace`; that placement decision looks like a gap between
 * design-reference.md (which calls for an always-visible search pill) and
 * tasks.md (T096 only wires `SearchBar`'s behavior, assuming it already
 * exists somewhere). Flagging for a future task/spec pass rather than
 * guessing its placement here.
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

describe('Dashboard launch (User Story 1)', () => {
  beforeEach(() => {
    clearDashboardStorage()
  })

  afterEach(() => {
    clearDashboardStorage()
  })

  it('shows search, date/time, weather status, and shortcut cards on load', async () => {
    render(<Dashboard />)

    expect(screen.getByRole('search')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /current date and time/i })).toBeInTheDocument()
    expect(await screen.findByRole('status')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Gmail' })).toBeInTheDocument()
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
    render(<Dashboard />)

    const status = await screen.findByRole('status')
    expect(status).toBeInTheDocument()
    expect(screen.getByRole('search')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Gmail' })).toBeInTheDocument()
  })
})
