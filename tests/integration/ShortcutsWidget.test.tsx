import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dashboard } from '../../src/features/dashboard/Dashboard'
import { clearDashboardStorage } from '../fixtures/dashboardConfig'

/**
 * `ShortcutsWidget`/`ShortcutCard` icon rendering (T086/T087) doesn't exist
 * yet; the icon-specific assertions here are expected to fail until that
 * work lands. Category grouping and read-only navigation (T068, already
 * built) are expected to already pass — this file also guards those
 * against regressing while T086-T089 land.
 *
 * Icons are located by a stable `data-icon-provider` attribute on each
 * card's icon wrapper — not by exact visual representation, which
 * legitimately differs by provider (an `<svg>`, an `<img>`, or initials
 * text) but per the UI contract must never differ in layout/size.
 *
 * Lookups here deliberately use `waitFor` + plain CSS selectors instead of
 * `findByRole`/`getByRole` for shortcut cards: `ShortcutsWidget`, like every
 * widget, is code-split behind `widgetRegistry.lazyLoad` (a hard UI-
 * contract rule, not an implementation shortcut) and briefly suspends for
 * one microtask tick on first mount — invisible in a real browser, but in
 * this test file specifically, `findByRole`'s accessible-role computation
 * becomes unreliable (hangs past its own timeout) after several repeated
 * `render(<Dashboard />)` calls in one file, now that `SettingsDrawer`
 * contributes a much larger accessibility tree (many checkboxes/dropdowns).
 * Plain `querySelector` polling sidesteps that reliably; role-based
 * queries remain fine for one-shot lookups elsewhere in the app's other
 * test files.
 */

async function findShortcutCard(url: string): Promise<HTMLElement> {
  return waitFor(() => {
    const link = document.querySelector(`a[href="${url}"]`)
    if (!link) {
      throw new Error(`shortcut link ${url} not found yet`)
    }
    return link.closest('.shortcut-card') as HTMLElement
  })
}

describe('ShortcutsWidget (User Story 3)', () => {
  beforeEach(() => {
    clearDashboardStorage()
  })

  afterEach(() => {
    clearDashboardStorage()
  })

  it('renders an icon wrapper on every shortcut card (UI contract Icon System section)', async () => {
    render(<Dashboard />)

    expect((await findShortcutCard('https://mail.google.com/')).querySelector('[data-icon-provider]')).not.toBeNull()
    expect((await findShortcutCard('https://github.com/')).querySelector('[data-icon-provider]')).not.toBeNull()
  })

  it('renders the same icon wrapper shape regardless of which provider resolved it — no layout difference by provider', async () => {
    render(<Dashboard />)

    const gmailIcon = (await findShortcutCard('https://mail.google.com/')).querySelector('[data-icon-provider]')
    const githubIcon = (await findShortcutCard('https://github.com/')).querySelector('[data-icon-provider]')
    expect(gmailIcon).not.toBeNull()
    expect(gmailIcon?.className).toBe(githubIcon?.className)
  })

  it('groups shortcuts by category via the existing CategoryNav', async () => {
    render(<Dashboard />)

    await waitFor(() => {
      expect(document.querySelector('.category-nav')).not.toBeNull()
    })
    const categoryButtons = Array.from(document.querySelectorAll('.category-nav__item')).map(
      (button) => button.textContent,
    )
    expect(categoryButtons).toEqual(['Todas', 'General'])
  })

  it('opens a shortcut via standard navigation — a real <a href>, not a click handler', async () => {
    render(<Dashboard />)

    const card = await findShortcutCard('https://github.com/')
    const link = card.querySelector('a')
    expect(link?.tagName).toBe('A')
    expect(link).toHaveAttribute('href', 'https://github.com/')
  })

  it('never makes a network request when a shortcut is clicked (no dashboard-side call about the target app)', async () => {
    const originalFetch = global.fetch
    const fetchSpy = vi.fn()
    global.fetch = fetchSpy as unknown as typeof fetch

    render(<Dashboard />)
    const card = await findShortcutCard('https://github.com/')
    const link = card.querySelector('a') as HTMLAnchorElement
    const user = userEvent.setup()
    // jsdom doesn't perform real navigation on an <a> click, so this only
    // confirms the click itself triggers no dashboard-side request.
    await user.click(link)

    expect(fetchSpy).not.toHaveBeenCalled()
    global.fetch = originalFetch
  })

  it('renders no live/fetched data on a shortcut card — never a status or loading indicator', async () => {
    render(<Dashboard />)

    const card = await findShortcutCard('https://mail.google.com/')
    expect(card.textContent).toContain('Gmail')
    // Business-data widgets (e.g. ServerStatusWidget) surface loading/
    // unavailable states via a `role="status"` StatusMessage; a shortcut
    // card — presentation-only per the UI contract's Shortcuts Widget
    // Boundary — must never have one, since it fetches nothing about the
    // target application.
    expect(card.querySelector('[role="status"]')).toBeNull()
  })
})
