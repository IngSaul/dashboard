import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dashboard } from '../../src/features/dashboard/Dashboard'
import { clearDashboardStorage } from '../fixtures/dashboardConfig'

/**
 * Shortcut personalization (add/edit/remove, persisted across reload) does
 * not exist on `Dashboard` yet (built across T039-T045): a Settings panel
 * (T042) to add shortcuts, per-card Edit/Remove actions (T043), and wiring
 * mutations back into persisted config (T044-T045). These tests define
 * that contract and are expected to fail until that work lands.
 *
 * Contract: a "Manage shortcuts" control opens a settings panel with a
 * labelled add form (accessible names matching /label/i and /url/i) and,
 * per shortcut, "Edit {label}"/"Remove {label}" controls.
 *
 * 002-widget-dashboard update: `Dashboard` now renders `<AppShell>`
 * (T054); `ShortcutsWidget` (T068) is a deliberately read-only browse/
 * launch view (per the UI contract's Shortcuts Widget Boundary) — add/
 * edit/remove moved to `WidgetSettings`/`SettingsDrawer`
 * (specs/002-widget-dashboard/tasks.md T076-T081), not this widget. These
 * tests are expected to stay red until that later work composes an
 * equivalent "Manage shortcuts" entry point somewhere in `SettingsDrawer`.
 */

describe('Shortcut personalization (User Story 2)', () => {
  beforeEach(() => {
    clearDashboardStorage()
  })

  afterEach(() => {
    clearDashboardStorage()
  })

  it('adds a new shortcut and shows it in the list', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)

    await user.click(screen.getByRole('button', { name: /manage shortcuts/i }))
    await user.type(screen.getByRole('textbox', { name: /label/i }), 'Docs')
    await user.type(screen.getByRole('textbox', { name: /url/i }), 'https://docs.example.com')
    await user.click(screen.getByRole('button', { name: /add shortcut/i }))

    expect(screen.getByRole('link', { name: 'Docs' })).toBeInTheDocument()
  })

  it('edits an existing shortcut label', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)

    await user.click(screen.getByRole('button', { name: /manage shortcuts/i }))
    await user.click(screen.getByRole('button', { name: 'Edit Gmail' }))
    const labelInput = screen.getByRole('textbox', { name: /label/i })
    await user.clear(labelInput)
    await user.type(labelInput, 'Mail')
    await user.click(screen.getByRole('button', { name: /save shortcut/i }))

    expect(screen.getByRole('link', { name: 'Mail' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Gmail' })).not.toBeInTheDocument()
  })

  it('removes a shortcut from the list', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)

    await user.click(screen.getByRole('button', { name: /manage shortcuts/i }))
    await user.click(screen.getByRole('button', { name: 'Remove Gmail' }))

    expect(screen.queryByRole('link', { name: 'Gmail' })).not.toBeInTheDocument()
  })

  it('persists shortcut changes after the dashboard reloads', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<Dashboard />)

    await user.click(screen.getByRole('button', { name: /manage shortcuts/i }))
    await user.click(screen.getByRole('button', { name: 'Remove Gmail' }))
    unmount()

    render(<Dashboard />)

    expect(screen.queryByRole('link', { name: 'Gmail' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Calendar' })).toBeInTheDocument()
  })

  it('reorders a shortcut and persists the new order after reload (FR-008)', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<Dashboard />)

    await user.click(screen.getByRole('button', { name: /manage shortcuts/i }))
    const links = () => screen.getAllByRole('link').map((link) => link.textContent)
    expect(links()).toEqual(['Gmail', 'Calendar', 'YouTube', 'GitHub'])

    await user.click(screen.getByRole('button', { name: 'Move Calendar up' }))
    expect(links()).toEqual(['Calendar', 'Gmail', 'YouTube', 'GitHub'])
    unmount()

    render(<Dashboard />)
    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Calendar',
      'Gmail',
      'YouTube',
      'GitHub',
    ])
  })

  it('creates a new category and can assign a shortcut to it (FR-009)', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<Dashboard />)

    await user.click(screen.getByRole('button', { name: /manage shortcuts/i }))
    await user.type(screen.getByRole('textbox', { name: /new category/i }), 'Dev Tools')
    await user.click(screen.getByRole('button', { name: /add category/i }))

    expect(
      screen.getByRole('option', { name: 'Dev Tools' }),
    ).toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: /category/i }), 'Dev Tools')
    await user.type(screen.getByRole('textbox', { name: /label/i }), 'Docs')
    await user.type(screen.getByRole('textbox', { name: /url/i }), 'https://docs.example.com')
    await user.click(screen.getByRole('button', { name: /add shortcut/i }))
    unmount()

    render(<Dashboard />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Dev Tools' }))
    expect(screen.getByRole('link', { name: 'Docs' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Gmail' })).not.toBeInTheDocument()
  })
})
