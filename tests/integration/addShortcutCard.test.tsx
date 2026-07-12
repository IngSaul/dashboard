import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dashboard } from '../../src/features/dashboard/Dashboard'
import { clearDashboardStorage, seedDashboardStorage } from '../fixtures/dashboardConfig'

/**
 * Covers the trailing "+" tile (`AddShortcutCard`) that restores shortcut
 * creation on the main grid, and its `AddShortcutModal`: the tile must
 * always render as the grid's last child, creating must update the grid
 * immediately and persist, and the tile must stay last through
 * create/edit/delete cycles.
 */
function grid(): HTMLElement {
  return document.querySelector('.shortcuts-widget__grid') as HTMLElement
}

function lastGridItemIsAddCard(): boolean {
  const lastChild = grid().lastElementChild
  return lastChild !== null && lastChild.classList.contains('add-shortcut-card')
}

describe('AddShortcutCard (create shortcuts from the grid)', () => {
  beforeEach(() => {
    clearDashboardStorage()
    seedDashboardStorage()
  })

  afterEach(() => {
    clearDashboardStorage()
  })

  it('renders the "+" tile as the last item in the grid', async () => {
    render(<Dashboard />)

    await screen.findByRole('link', { name: 'Mail' })
    expect(screen.getByRole('button', { name: 'Añadir acceso directo' })).toBeInTheDocument()
    expect(lastGridItemIsAddCard()).toBe(true)
  })

  it('creates a new shortcut through the modal, updates the grid immediately, and keeps "+" last', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)
    await screen.findByRole('link', { name: 'Mail' })

    await user.click(screen.getByRole('button', { name: 'Añadir acceso directo' }))
    const dialog = screen.getByRole('dialog', { name: 'Añadir acceso directo' })
    await user.type(within(dialog).getByRole('textbox', { name: /nombre/i }), 'Docs')
    await user.type(within(dialog).getByRole('textbox', { name: /url/i }), 'https://docs.example.com')
    await user.click(within(dialog).getByRole('button', { name: /crear/i }))

    expect(screen.getByRole('link', { name: 'Docs' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Añadir acceso directo' })).not.toBeInTheDocument()
    expect(lastGridItemIsAddCard()).toBe(true)
  })

  it('persists a created shortcut across reload', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<Dashboard />)
    await screen.findByRole('link', { name: 'Mail' })

    await user.click(screen.getByRole('button', { name: 'Añadir acceso directo' }))
    const dialog = screen.getByRole('dialog', { name: 'Añadir acceso directo' })
    await user.type(within(dialog).getByRole('textbox', { name: /nombre/i }), 'Docs')
    await user.type(within(dialog).getByRole('textbox', { name: /url/i }), 'https://docs.example.com')
    await user.click(within(dialog).getByRole('button', { name: /crear/i }))

    unmount()
    render(<Dashboard />)

    expect(await screen.findByRole('link', { name: 'Docs' })).toBeInTheDocument()
    expect(lastGridItemIsAddCard()).toBe(true)
  })

  it('does not create a shortcut when the add modal is cancelled', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)
    await screen.findByRole('link', { name: 'Mail' })
    const linksBefore = screen.getAllByRole('link').length

    await user.click(screen.getByRole('button', { name: 'Añadir acceso directo' }))
    const dialog = screen.getByRole('dialog', { name: 'Añadir acceso directo' })
    await user.type(within(dialog).getByRole('textbox', { name: /nombre/i }), 'Temp')
    await user.click(within(dialog).getByRole('button', { name: /cancelar/i }))

    expect(screen.queryByRole('dialog', { name: 'Añadir acceso directo' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Temp' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(linksBefore)
    expect(lastGridItemIsAddCard()).toBe(true)
  })

  it('keeps "+" as the last item through a create, an edit, and a delete', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)
    await screen.findByRole('link', { name: 'Mail' })

    await user.click(screen.getByRole('button', { name: 'Añadir acceso directo' }))
    const addDialog = screen.getByRole('dialog', { name: 'Añadir acceso directo' })
    await user.type(within(addDialog).getByRole('textbox', { name: /nombre/i }), 'Docs')
    await user.type(within(addDialog).getByRole('textbox', { name: /url/i }), 'https://docs.example.com')
    await user.click(within(addDialog).getByRole('button', { name: /crear/i }))
    expect(lastGridItemIsAddCard()).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Acciones para Docs' }))
    await user.click(screen.getByRole('menuitem', { name: 'Editar' }))
    const editDialog = screen.getByRole('dialog', { name: 'Editar acceso directo' })
    const labelInput = within(editDialog).getByRole('textbox', { name: /nombre/i })
    await user.clear(labelInput)
    await user.type(labelInput, 'Documentos')
    await user.click(within(editDialog).getByRole('button', { name: /guardar/i }))
    expect(lastGridItemIsAddCard()).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Acciones para Mail' }))
    await user.click(screen.getByRole('menuitem', { name: 'Eliminar' }))
    const confirmDialog = screen.getByRole('dialog', { name: 'Eliminar acceso directo' })
    await user.click(within(confirmDialog).getByRole('button', { name: 'Eliminar' }))

    expect(screen.queryByRole('link', { name: 'Mail' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Documentos' })).toBeInTheDocument()
    expect(lastGridItemIsAddCard()).toBe(true)
  })
})
