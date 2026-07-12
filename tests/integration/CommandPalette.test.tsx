import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dashboard } from '../../src/features/dashboard/Dashboard'
import { clearDashboardStorage } from '../fixtures/dashboardConfig'

/**
 * `CommandPalette` (Cmd/Ctrl+K) sources results from `searchEngine`
 * (T097), unscoped — it sees `web`, `shortcut`, and `command` results. A
 * command result's `onSelect()` emits `eventBus`'s `settings:open-section`
 * (never imports `SettingsDrawer` directly, per the UI contract's AppShell
 * rule) — `SettingsDrawer` listens and scrolls/focuses the matching section
 * (`#settings-section-{id}`).
 *
 * `SearchBar` (the always-visible dashboard search box) was removed: no
 * WebExtensions API lets a page focus or write into the browser's own
 * address bar, so it could only ever mimic — not proxy — the browser's
 * real omnibox/default search engine. This file previously also asserted
 * `SearchBar`/`CommandPalette` consistency; those assertions were dropped
 * along with `SearchBar`.
 */
describe('CommandPalette', () => {
  beforeEach(() => {
    clearDashboardStorage()
  })

  afterEach(() => {
    clearDashboardStorage()
  })

  it('suggests a shortcut match for a query', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)

    await user.keyboard('{Control>}k{/Control}')
    await user.type(screen.getByRole('combobox', { name: /buscar o ejecutar un comando/i }), 'gmail')

    expect(await screen.findByRole('option', { name: 'Gmail' })).toBeInTheDocument()
  })

  it('returns command results for settings sections', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)

    await user.keyboard('{Control>}k{/Control}')
    await user.type(
      screen.getByRole('combobox', { name: /buscar o ejecutar un comando/i }),
      'fondo de pantalla',
    )

    expect(await screen.findByRole('option', { name: 'Abrir configuración de fondo de pantalla' })).toBeInTheDocument()
  })

  it('activating a command result opens SettingsDrawer to the correct section via eventBus', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)

    await user.keyboard('{Control>}k{/Control}')
    await user.type(
      screen.getByRole('combobox', { name: /buscar o ejecutar un comando/i }),
      'fondo de pantalla',
    )
    await user.click(await screen.findByRole('option', { name: 'Abrir configuración de fondo de pantalla' }))

    await waitFor(() => {
      expect(document.querySelector('.settings-drawer')).toHaveAttribute('data-open', 'true')
    })
    await waitFor(() => {
      expect(document.activeElement?.id).toBe('settings-section-wallpaper')
    })
  })
})
