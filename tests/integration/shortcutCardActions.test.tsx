import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dashboard } from '../../src/features/dashboard/Dashboard'
import { clearDashboardStorage, seedDashboardStorage } from '../fixtures/dashboardConfig'

/**
 * Covers the per-`ShortcutCard` hover menu (⋮ -> Editar/Eliminar) added on
 * top of the main dashboard grid: `ShortcutsWidget` used to be launch-only
 * (add/edit/remove lived only in `SettingsDrawer`); these tests define the
 * new in-place editing/deletion contract directly on the grid.
 */
describe('Shortcut card actions (hover menu, edit modal, delete confirmation)', () => {
  beforeEach(() => {
    clearDashboardStorage()
    seedDashboardStorage()
  })

  afterEach(() => {
    clearDashboardStorage()
  })

  it('edits a shortcut through the card menu and modal, updating the card immediately', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)

    await screen.findByRole('link', { name: 'Mail' })
    await user.click(screen.getByRole('button', { name: 'Acciones para Mail' }))
    await user.click(screen.getByRole('menuitem', { name: 'Editar' }))

    const dialog = screen.getByRole('dialog', { name: 'Editar acceso directo' })
    const labelInput = within(dialog).getByRole('textbox', { name: /nombre/i })
    await user.clear(labelInput)
    await user.type(labelInput, 'Correo')
    await user.click(within(dialog).getByRole('button', { name: /guardar/i }))

    expect(screen.getByRole('link', { name: 'Correo' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Mail' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Editar acceso directo' })).not.toBeInTheDocument()
  })

  it('persists an edit across reload and keeps the shortcut in its original grid position', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<Dashboard />)

    await screen.findByRole('link', { name: 'Mail' })
    await user.click(screen.getByRole('button', { name: 'Acciones para Mail' }))
    await user.click(screen.getByRole('menuitem', { name: 'Editar' }))
    const dialog = screen.getByRole('dialog', { name: 'Editar acceso directo' })
    const labelInput = within(dialog).getByRole('textbox', { name: /nombre/i })
    await user.clear(labelInput)
    await user.type(labelInput, 'Correo')
    await user.click(within(dialog).getByRole('button', { name: /guardar/i }))

    unmount()
    render(<Dashboard />)

    const links = await screen.findAllByRole('link')
    expect(links[0]).toHaveAccessibleName('Correo')
  })

  it('cancels editing without changing the shortcut when closed via the backdrop', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)

    await screen.findByRole('link', { name: 'Mail' })
    await user.click(screen.getByRole('button', { name: 'Acciones para Mail' }))
    await user.click(screen.getByRole('menuitem', { name: 'Editar' }))
    const dialog = screen.getByRole('dialog', { name: 'Editar acceso directo' })
    await user.click(within(dialog).getByRole('button', { name: /cancelar/i }))

    expect(screen.queryByRole('dialog', { name: 'Editar acceso directo' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mail' })).toBeInTheDocument()
  })

  it('asks for confirmation before deleting, and keeps the shortcut when cancelled', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)

    await screen.findByRole('link', { name: 'Mail' })
    await user.click(screen.getByRole('button', { name: 'Acciones para Mail' }))
    await user.click(screen.getByRole('menuitem', { name: 'Eliminar' }))

    const confirmDialog = screen.getByRole('dialog', { name: 'Eliminar acceso directo' })
    expect(within(confirmDialog).getByText(/mail/i)).toBeInTheDocument()

    await user.click(within(confirmDialog).getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog', { name: 'Eliminar acceso directo' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Mail' })).toBeInTheDocument()
  })

  it('deletes the shortcut once the confirmation dialog is confirmed', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)

    await screen.findByRole('link', { name: 'Mail' })
    await user.click(screen.getByRole('button', { name: 'Acciones para Mail' }))
    await user.click(screen.getByRole('menuitem', { name: 'Eliminar' }))
    const confirmDialog = screen.getByRole('dialog', { name: 'Eliminar acceso directo' })
    await user.click(within(confirmDialog).getByRole('button', { name: 'Eliminar' }))

    expect(screen.queryByRole('link', { name: 'Mail' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Eliminar acceso directo' })).not.toBeInTheDocument()
  })
})
