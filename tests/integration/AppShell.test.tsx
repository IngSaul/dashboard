import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppShell } from '../../src/components/shell/AppShell/AppShell'
import { clearDashboardStorage } from '../fixtures/dashboardConfig'

/**
 * `AppShell` composition (T053): the five state Providers plus
 * `BackgroundLayer`/`Workspace`/`SettingsDrawer`/`CommandPalette`. No widget
 * plugins are registered in this test, so `Workspace` is expected to render
 * zero widgets — matching the Foundational-phase checkpoint in
 * specs/002-widget-dashboard/tasks.md ("AppShell renders an empty,
 * correctly-themed, responsive shell with zero widgets").
 */
describe('AppShell', () => {
  beforeEach(() => {
    clearDashboardStorage()
  })

  afterEach(() => {
    clearDashboardStorage()
  })

  it('renders the background layer, an empty workspace, and a closed settings drawer', () => {
    render(<AppShell />)

    expect(document.querySelector('.background-layer')).not.toBeNull()
    expect(document.querySelectorAll('.workspace-column')).toHaveLength(3)
    expect(document.querySelectorAll('.widget-slot')).toHaveLength(0)
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
