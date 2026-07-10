import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppShell } from '../../src/components/shell/AppShell/AppShell'
import { clearDashboardStorage } from '../fixtures/dashboardConfig'

/**
 * `AppShell` composition (T053): the five state Providers plus
 * `BackgroundLayer`/`Workspace`/`SettingsDrawer`/`CommandPalette`.
 * `tests/setup.ts` registers every built-in widget plugin once per test
 * file (mirroring `main.tsx`'s app-init call), so `Workspace` renders the
 * two default-enabled widgets (clock + shortcuts) here — matching the User
 * Story 1 checkpoint, not the earlier Foundational-phase "zero widgets"
 * one.
 */
describe('AppShell', () => {
  beforeEach(() => {
    clearDashboardStorage()
  })

  afterEach(() => {
    clearDashboardStorage()
  })

  it('renders the background layer, the default clock/shortcuts widgets, and a closed settings drawer', () => {
    render(<AppShell />)

    expect(document.querySelector('.background-layer')).not.toBeNull()
    expect(document.querySelectorAll('.workspace-column')).toHaveLength(3)
    expect(document.querySelector('.widget-slot[data-widget-type="clock"]')).not.toBeNull()
    expect(document.querySelector('.widget-slot[data-widget-type="shortcuts"]')).not.toBeNull()
    expect(document.querySelectorAll('.widget-slot')).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Toggle settings' })).toBeInTheDocument()
  })

  it('applies a resolved light/dark theme to the document root', () => {
    render(<AppShell />)

    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('opens and closes the settings drawer via its toggle', async () => {
    const user = userEvent.setup()
    render(<AppShell />)

    await user.click(screen.getByRole('button', { name: 'Toggle settings' }))
    expect(screen.getByRole('dialog', { name: 'Settings' })).toHaveAttribute('data-open', 'true')

    await user.click(screen.getByRole('button', { name: 'Close settings' }))
    expect(screen.getByRole('dialog', { name: 'Settings' })).toHaveAttribute('data-open', 'false')
  })

  it('closes the settings drawer on Escape', async () => {
    const user = userEvent.setup()
    render(<AppShell />)

    await user.click(screen.getByRole('button', { name: 'Toggle settings' }))
    expect(screen.getByRole('dialog', { name: 'Settings' })).toHaveAttribute('data-open', 'true')

    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog', { name: 'Settings' })).toHaveAttribute('data-open', 'false')
  })

  it('opens the command palette via the keyboard shortcut and shows an empty result state', async () => {
    const user = userEvent.setup()
    render(<AppShell />)

    await user.keyboard('{Control>}k{/Control}')

    expect(screen.getByRole('dialog', { name: 'Command palette' })).toHaveAttribute('open')
    expect(screen.getByText('Type to search…')).toBeInTheDocument()
  })
})
