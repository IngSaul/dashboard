import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dashboard } from '../../src/features/dashboard/Dashboard'
import {
  clearDashboardStorage,
  seedDashboardStorage,
  workCategoryFixture,
} from '../fixtures/dashboardConfig'

/**
 * Covers the trailing "+" tile (`AddCategoryCard`) that lets the user
 * create a category directly from `CategoryNav`, and its `AddCategoryModal`:
 * the tile must always render as the nav's last item, creating must update
 * the nav immediately, auto-select the new category, persist, and reject
 * duplicate names case-insensitively — mirroring `addShortcutCard.test.tsx`'s
 * coverage of the equivalent shortcut-grid flow.
 */
function nav(): HTMLElement {
  return document.querySelector('.category-nav') as HTMLElement
}

function lastNavItemIsAddCard(): boolean {
  const lastChild = nav().lastElementChild
  return lastChild !== null && lastChild.classList.contains('add-category-card')
}

describe('AddCategoryCard (create categories from the grid)', () => {
  beforeEach(() => {
    clearDashboardStorage()
    seedDashboardStorage()
  })

  afterEach(() => {
    clearDashboardStorage()
  })

  it('renders the "+" tile as the last item in the category nav', async () => {
    render(<Dashboard />)

    await screen.findByRole('link', { name: 'Mail' })
    expect(screen.getByRole('button', { name: 'Añadir categoría' })).toBeInTheDocument()
    expect(lastNavItemIsAddCard()).toBe(true)
  })

  it('creates a new category, adds it before the "+" tile, and auto-selects it', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)
    await screen.findByRole('link', { name: 'Mail' })

    await user.click(screen.getByRole('button', { name: 'Añadir categoría' }))
    const dialog = screen.getByRole('dialog', { name: 'Añadir categoría' })
    await user.type(within(dialog).getByRole('textbox', { name: /nombre/i }), 'Learning')
    await user.click(within(dialog).getByRole('button', { name: /crear categoría/i }))

    expect(screen.queryByRole('dialog', { name: 'Añadir categoría' })).not.toBeInTheDocument()
    const newCategoryButton = screen.getByRole('button', { name: 'Learning' })
    expect(newCategoryButton).toBeInTheDocument()
    expect(newCategoryButton.getAttribute('aria-pressed')).toBe('true')
    expect(lastNavItemIsAddCard()).toBe(true)
  })

  it('persists a created category across reload', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<Dashboard />)
    await screen.findByRole('link', { name: 'Mail' })

    await user.click(screen.getByRole('button', { name: 'Añadir categoría' }))
    const dialog = screen.getByRole('dialog', { name: 'Añadir categoría' })
    await user.type(within(dialog).getByRole('textbox', { name: /nombre/i }), 'Learning')
    await user.click(within(dialog).getByRole('button', { name: /crear categoría/i }))

    unmount()
    render(<Dashboard />)

    expect(await screen.findByRole('button', { name: 'Learning' })).toBeInTheDocument()
    expect(lastNavItemIsAddCard()).toBe(true)
  })

  it('rejects a duplicate category name, ignoring case, and keeps the modal open', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)
    await screen.findByRole('link', { name: 'Mail' })

    await user.click(screen.getByRole('button', { name: 'Añadir categoría' }))
    const dialog = screen.getByRole('dialog', { name: 'Añadir categoría' })
    await user.type(within(dialog).getByRole('textbox', { name: /nombre/i }), workCategoryFixture.name.toUpperCase())
    await user.click(within(dialog).getByRole('button', { name: /crear categoría/i }))

    expect(screen.getByRole('dialog', { name: 'Añadir categoría' })).toBeInTheDocument()
    expect(within(dialog).getByRole('alert')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: workCategoryFixture.name })).toHaveLength(1)
  })

  it('rejects a blank category name', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)
    await screen.findByRole('link', { name: 'Mail' })

    await user.click(screen.getByRole('button', { name: 'Añadir categoría' }))
    const dialog = screen.getByRole('dialog', { name: 'Añadir categoría' })
    await user.click(within(dialog).getByRole('button', { name: /crear categoría/i }))

    expect(screen.getByRole('dialog', { name: 'Añadir categoría' })).toBeInTheDocument()
    expect(within(dialog).getByRole('alert')).toBeInTheDocument()
  })

  it('closes the modal without creating a category when clicking outside it', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)
    await screen.findByRole('link', { name: 'Mail' })

    await user.click(screen.getByRole('button', { name: 'Añadir categoría' }))
    const dialog = screen.getByRole('dialog', { name: 'Añadir categoría' })
    await user.type(within(dialog).getByRole('textbox', { name: /nombre/i }), 'Temp')

    // `GlassDialog` closes on a click that lands on the native <dialog>
    // element itself (the backdrop), not on its content.
    await user.click(dialog)

    expect(screen.queryByRole('dialog', { name: 'Añadir categoría' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Temp' })).not.toBeInTheDocument()
    expect(lastNavItemIsAddCard()).toBe(true)
  })
})
