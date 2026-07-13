import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dashboard } from '../../src/features/dashboard/Dashboard'
import { clearDashboardStorage, seedDashboardStorage } from '../fixtures/dashboardConfig'
import { DASHBOARD_CONFIG_STORAGE_KEY } from '../../src/services/configStore'
import type { DashboardConfiguration } from '../../src/types/dashboard'

/**
 * Drag reordering is exercised via `@dnd-kit`'s keyboard sensor
 * (`Space` to pick up, `ArrowRight`/`ArrowDown` to move, `Space` to drop)
 * rather than simulated pointer events: jsdom has no real layout engine, so
 * pointer-based collision detection isn't meaningfully testable here — real
 * pointer-drag coverage lives in the Playwright e2e spec instead. The
 * keyboard path exercises the same `onReorder` → `useShortcutLibrary.
 * moveShortcut` → persistence pipeline the mouse/touch sensors also drive.
 */

function readStoredConfig(): DashboardConfiguration {
  const raw = window.localStorage.getItem(DASHBOARD_CONFIG_STORAGE_KEY)
  if (!raw) throw new Error('dashboard config not persisted yet')
  return JSON.parse(raw) as DashboardConfiguration
}

function readStoredShortcutIds(categoryId: string): string[] {
  return readStoredConfig()
    .shortcuts.filter((shortcut) => shortcut.categoryId === categoryId)
    .sort((a, b) => a.globalOrder - b.globalOrder)
    .map((shortcut) => shortcut.id)
}

/**
 * Drag activation (keyboard and pointer alike) lives on the shortcut's own
 * `<a>` link, not a separate element on the card — see `ShortcutCard`'s
 * `linkRef`/`linkDragProps`: putting `tabIndex` on the outer card would add
 * a second, redundant tab stop per card.
 */
async function findShortcutLink(url: string): Promise<HTMLAnchorElement> {
  return waitFor(() => {
    const link = document.querySelector(`a[href="${url}"]`)
    if (!link) {
      throw new Error(`shortcut link ${url} not found yet`)
    }
    return link as HTMLAnchorElement
  })
}

function findRealShortcutCards(): HTMLElement[] {
  return Array.from(document.querySelectorAll('.shortcuts-widget__grid .shortcut-card:not(.add-shortcut-card)'))
}

/**
 * `KeyboardSensor` (`@dnd-kit/core`) attaches its follow-up `keydown`
 * listener via a real `setTimeout(0)` (see `KeyboardSensor.attach`), so the
 * pickup keystroke and the move/drop keystrokes that follow it must each
 * wait a macrotask tick, or the listener isn't attached yet to receive them.
 */
async function pressKey(node: HTMLElement, code: string): Promise<void> {
  fireEvent.keyDown(node, { code })
  await new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * jsdom performs no layout, so every element's real `getBoundingClientRect`
 * is zeroed — `@dnd-kit`'s collision detection (including the keyboard
 * coordinate getter) compares rects and finds no candidate to move to
 * without this. Stubs a plausible stacked-column rect per shortcut card,
 * keyed by its live DOM order, so `ArrowDown`/`ArrowUp` have something real
 * to collide against. Deliberately *non-uniform* spacing (not a flat `index
 * * 140`): a middle card picked up between two evenly-spaced neighbors ties
 * on distance to both at zero movement, and `closestCorners` breaks that
 * tie unpredictably — uneven gaps make every candidate strictly closer or
 * farther, so `ArrowDown`/`ArrowUp` resolve deterministically.
 */
const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect
const CARD_TOPS = [0, 140, 220, 360, 440, 520]

function stubCardRects(): void {
  Element.prototype.getBoundingClientRect = function (this: Element) {
    if (this.matches('.shortcut-card:not(.add-shortcut-card)')) {
      const index = findRealShortcutCards().indexOf(this as HTMLElement)
      const top = index >= 0 ? (CARD_TOPS[index] ?? index * 140) : 0
      return {
        x: 0,
        y: top,
        top,
        left: 0,
        right: 112,
        bottom: top + 112,
        width: 112,
        height: 112,
        toJSON: () => ({}),
      } as DOMRect
    }
    return originalGetBoundingClientRect.call(this)
  }
}

describe('shortcut drag reorder (ShortcutGrid + useShortcutLibrary)', () => {
  beforeEach(() => {
    clearDashboardStorage()
    seedDashboardStorage()
    stubCardRects()
  })

  afterEach(() => {
    clearDashboardStorage()
    Element.prototype.getBoundingClientRect = originalGetBoundingClientRect
  })

  it('reorders within a category via the keyboard sortable path and persists it', async () => {
    render(<Dashboard />)
    const user = userEvent.setup()

    await waitFor(() => expect(document.querySelector('.category-nav')).not.toBeNull())
    await user.click(screen.getByRole('button', { name: 'Work' }))

    const mailLink = await findShortcutLink('https://mail.example.com')
    expect(readStoredShortcutIds('category-work')).toEqual(['shortcut-mail', 'shortcut-calendar'])

    mailLink.focus()
    await pressKey(mailLink, 'Space')
    await pressKey(mailLink, 'ArrowDown')
    await pressKey(mailLink, 'Space')

    await waitFor(
      () => {
        expect(readStoredShortcutIds('category-work')).toEqual(['shortcut-calendar', 'shortcut-mail'])
      },
      { timeout: 3000 },
    )
  })

  it('keeps Enter as normal link activation instead of hijacking it for pick-up', async () => {
    render(<Dashboard />)
    const user = userEvent.setup()
    await waitFor(() => expect(document.querySelector('.category-nav')).not.toBeNull())
    await user.click(screen.getByRole('button', { name: 'Work' }))
    const mailLink = await findShortcutLink('https://mail.example.com')

    mailLink.focus()
    await pressKey(mailLink, 'Enter')

    // Enter never engaged the sortable's keyboard sensor — order untouched.
    expect(readStoredShortcutIds('category-work')).toEqual(['shortcut-mail', 'shortcut-calendar'])
  })

  it('does not re-scramble on the next render — the new order survives a fresh mount (reload simulation)', async () => {
    const { unmount } = render(<Dashboard />)
    const user = userEvent.setup()
    await waitFor(() => expect(document.querySelector('.category-nav')).not.toBeNull())
    await user.click(screen.getByRole('button', { name: 'Work' }))
    const mailLink = await findShortcutLink('https://mail.example.com')

    mailLink.focus()
    await pressKey(mailLink, 'Space')
    await pressKey(mailLink, 'ArrowDown')
    await pressKey(mailLink, 'Space')
    await waitFor(() => expect(readStoredShortcutIds('category-work')).toEqual(['shortcut-calendar', 'shortcut-mail']), {
      timeout: 3000,
    })

    unmount()
    render(<Dashboard />)
    await waitFor(() => expect(document.querySelector('.category-nav')).not.toBeNull())
    await user.click(screen.getByRole('button', { name: 'Work' }))

    const cards = await waitFor(() => {
      const found = findRealShortcutCards()
      if (found.length < 2) throw new Error('cards not rendered yet')
      return found
    })
    const hrefs = cards.map((card) => card.querySelector('a')?.getAttribute('href'))
    expect(hrefs).toEqual(['https://calendar.example.com', 'https://mail.example.com'])
  })

  it('"Todas" shows the concatenation of each category\'s order and is drag-activatable', async () => {
    render(<Dashboard />)
    await waitFor(() => expect(document.querySelector('.category-nav')).not.toBeNull())

    const cards = await waitFor(() => {
      const found = findRealShortcutCards()
      if (found.length < 4) throw new Error('cards not rendered yet')
      return found
    })
    const hrefs = cards.map((card) => card.querySelector('a')?.getAttribute('href'))
    expect(hrefs).toEqual([
      'https://mail.example.com',
      'https://calendar.example.com',
      'https://news.example.com',
      'https://notes.example.com',
    ])
    // dnd-kit's sortable wiring is present in "Todas" too (no per-tab
    // `disabled` switch) — `aria-roledescription="sortable"` on every link.
    cards.forEach((card) => {
      expect(card.querySelector('a')).toHaveAttribute('aria-roledescription', 'sortable')
    })
  })

  it('allows reordering within a category from "Todas" and rebuilds the concatenation immediately', async () => {
    render(<Dashboard />)
    await waitFor(() => expect(document.querySelector('.category-nav')).not.toBeNull())
    // Default view is already "Todas" — no tab click needed.
    const mailLink = await findShortcutLink('https://mail.example.com')
    expect(readStoredShortcutIds('category-work')).toEqual(['shortcut-mail', 'shortcut-calendar'])

    mailLink.focus()
    await pressKey(mailLink, 'Space')
    await pressKey(mailLink, 'ArrowDown')
    await pressKey(mailLink, 'Space')

    await waitFor(
      () => {
        expect(readStoredShortcutIds('category-work')).toEqual(['shortcut-calendar', 'shortcut-mail'])
        const hrefs = findRealShortcutCards().map((card) => card.querySelector('a')?.getAttribute('href'))
        expect(hrefs).toEqual([
          'https://calendar.example.com',
          'https://mail.example.com',
          'https://news.example.com',
          'https://notes.example.com',
        ])
      },
      { timeout: 3000 },
    )
  })

  // Cross-category-boundary dragging (dropping a card so it lands beside one
  // from a *different* category) is intentionally not exercised here via
  // simulated drag gestures: jsdom does no layout, and — unlike the
  // same-category case above — `@dnd-kit`'s initial (zero-delta) collision
  // resolution on pickup was found to not reliably reflect the stubbed rects
  // in this environment regardless of sensor (keyboard or mouse events), so a
  // precise "lands beside this specific other-category card" assertion would
  // be testing jsdom/stub quirks, not the feature. The core guarantee this
  // exercises — that a shortcut's `categoryId` never changes as a side
  // effect of moving it, only its `globalOrder` — is exhaustively covered by
  // `moveShortcut`'s unit tests (`tests/unit/shortcuts.test.ts`,
  // deterministic pure-function calls with no layout dependency); the real
  // drag gesture crossing categories is covered end-to-end with genuine
  // browser layout in `tests/e2e/shortcutReorder.spec.ts`.

  it('assigns a newly created shortcut with no category to "General", appended at the end of the single global order', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)
    await waitFor(() => expect(document.querySelector('.category-nav')).not.toBeNull())

    await user.click(screen.getByRole('button', { name: 'Añadir acceso directo' }))
    const dialog = screen.getByRole('dialog', { name: 'Añadir acceso directo' })
    await user.type(within(dialog).getByRole('textbox', { name: /nombre/i }), 'Speedtest')
    await user.type(within(dialog).getByRole('textbox', { name: /url/i }), 'https://speedtest.example.com')
    await user.click(within(dialog).getByRole('button', { name: /crear/i }))

    expect(await screen.findByRole('link', { name: 'Speedtest' })).toBeInTheDocument()

    const config = readStoredConfig()
    const general = config.categories.find((category) => category.name === 'General')
    expect(general).toBeDefined()
    const created = config.shortcuts.find((shortcut) => shortcut.label === 'Speedtest')
    expect(created?.categoryId).toBe(general?.id)
    // Appends after every existing shortcut in the whole list (4 fixtures),
    // not just after "General"'s own — there is no per-category order.
    expect(created?.globalOrder).toBe(4)
  })
})
