import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dashboard } from '../../src/features/dashboard/Dashboard'
import { clearDashboardStorage } from '../fixtures/dashboardConfig'

/**
 * Keyboard navigation for User Story 3: reachability/operability for
 * categories, shortcuts, theme, and settings via keyboard alone (UI
 * contract's Keyboard Navigation section).
 *
 * `tabUntil` presses Tab repeatedly until an element matching `predicate`
 * receives focus, rather than asserting one exact, brittle Tab sequence —
 * the real requirement is that every primary control is *somewhere* in a
 * reachable, logical tab order, not at a specific step count.
 *
 * 003-auth-persistence update: two tests previously targeted controls that
 * never actually existed in this shape — verified against `main` before
 * this feature (`git worktree` diff against 2b4ee82): both were already
 * failing there too, so this is pre-existing test debt from the
 * 002-widget-dashboard drawer consolidation, not something introduced
 * here. Rewritten for the actual current flow: the theme toggle lives
 * inside `SettingsDrawer` (opened via "Alternar configuración"), and
 * shortcut creation is the grid's "Añadir acceso directo" tile opening
 * `AddShortcutModal` — there is no "Manage shortcuts" control anymore.
 */

async function tabUntil(
  user: ReturnType<typeof userEvent.setup>,
  predicate: (element: Element) => boolean,
  maxSteps = 30,
): Promise<Element> {
  for (let step = 0; step < maxSteps; step += 1) {
    await user.tab()
    const active = document.activeElement
    if (active && predicate(active)) {
      return active
    }
  }
  throw new Error('Element not reached via Tab within maxSteps')
}

describe('Keyboard navigation (User Story 3)', () => {
  beforeEach(() => {
    clearDashboardStorage()
  })

  afterEach(() => {
    clearDashboardStorage()
  })

  it('reaches and activates the theme toggle using only the keyboard', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)

    const before = document.documentElement.getAttribute('data-theme')

    await tabUntil(user, (el) => el.getAttribute('aria-label') === 'Alternar configuración')
    await user.keyboard('{Enter}')

    await tabUntil(user, (el) => (el.getAttribute('aria-label') ?? '').startsWith('Cambiar tema'), 60)
    // The toggle cycles system -> light -> dark -> system; two activations
    // guarantee a resolved-theme change regardless of the starting mode.
    await user.keyboard('{Enter}')
    await user.keyboard('{Enter}')

    expect(document.documentElement.getAttribute('data-theme')).not.toBe(before)
  })

  it('reaches a category filter and a shortcut link using only the keyboard', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)

    // The shortcuts widget (and "General" inside it) is code-split behind
    // `widgetRegistry.lazyLoad` — pressing Tab doesn't trigger rendering,
    // so the loop below must not start until the target actually exists;
    // otherwise a slow-to-mount widget makes every Tab press miss it. A
    // generous timeout covers this file's very first widget mount, which
    // pays the one-time cost of that chunk's on-demand transform.
    await screen.findByRole('button', { name: 'General' }, { timeout: 3000 })
    const categoryButton = await tabUntil(user, (el) => el.textContent === 'General')
    await user.keyboard('{Enter}')
    expect(categoryButton.getAttribute('aria-pressed')).toBe('true')

    const shortcutLink = await tabUntil(user, (el) => el.textContent?.includes('Gmail') === true)
    expect(shortcutLink.tagName).toBe('A')
  })

  it('opens the add-shortcut modal and reaches its fields using only the keyboard', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)

    // Same lazy-mount race as above — wait for the tile to exist before tabbing to it.
    await screen.findByRole('button', { name: 'Añadir acceso directo' }, { timeout: 3000 })
    await tabUntil(user, (el) => el.getAttribute('aria-label') === 'Añadir acceso directo')
    await user.keyboard('{Enter}')

    const nameField = await tabUntil(user, (el) => el.tagName === 'INPUT', 60)
    expect(nameField).toBe(screen.getByRole('textbox', { name: /nombre/i }))
  })
})
