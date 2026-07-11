import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dashboard } from '../../src/features/dashboard/Dashboard'
import { clearDashboardStorage } from '../fixtures/dashboardConfig'

/**
 * `SearchBar` and `CommandPalette` both source results from the same
 * `searchEngine` (T096/T097), so a query matching a shortcut returns the
 * same shortcut result from both entry points — `SearchBar` scoped to
 * `web`/`shortcut` kinds, `CommandPalette` unscoped (also sees `command`
 * results). A command result's `onSelect()` emits `eventBus`'s
 * `settings:open-section` (never imports `SettingsDrawer` directly, per
 * the UI contract's AppShell rule) — `SettingsDrawer` listens and scrolls/
 * focuses the matching section (`#settings-section-{id}`).
 */
describe('SearchBar and CommandPalette consistency', () => {
  beforeEach(() => {
    clearDashboardStorage()
  })

  afterEach(() => {
    clearDashboardStorage()
  })

  it('SearchBar suggests the same shortcut match as CommandPalette for the same query', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)

    await user.type(screen.getByRole('textbox', { name: /buscar/i }), 'gmail')
    expect(await screen.findByRole('option', { name: 'Gmail' })).toBeInTheDocument()
    await user.clear(screen.getByRole('textbox', { name: /buscar/i }))

    await user.keyboard('{Control>}k{/Control}')
    await user.type(screen.getByRole('combobox', { name: /buscar o ejecutar un comando/i }), 'gmail')

    expect(await screen.findByRole('option', { name: 'Gmail' })).toBeInTheDocument()
  })

  it('CommandPalette also returns command results that SearchBar (scoped to web/shortcut) never shows', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)

    await user.type(screen.getByRole('textbox', { name: /buscar/i }), 'fondo de pantalla')
    await waitFor(() => {
      expect(screen.queryByRole('option', { name: 'Abrir configuración de fondo de pantalla' })).toBeNull()
    })

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
