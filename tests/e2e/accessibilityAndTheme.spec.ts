import type { Page } from '@playwright/test'
import { expect, test, waitForPersistedConfig } from './fixtures'

/**
 * Keyboard operability, visible focus, and theme persistence across a real
 * reload.
 *
 * Rewritten from the feature-001 expectations (a `role=search` bar and an
 * always-visible "Toggle theme" button in the page chrome). Neither exists
 * today: `ThemeToggle` lives inside `SettingsDrawer`'s theme section and is
 * labelled in Spanish, and the dashboard's first tab stop is the drawer
 * toggle. The behaviour being protected — theme survives a reload, controls
 * are keyboard-reachable, focus is visible — is unchanged; only the way the
 * suite reaches it is.
 */

/** `ThemeToggle` cycles system → light → dark, naming its current mode in its own label. */
const THEME_TOGGLE = /Cambiar tema, actualmente/

async function openSettings(page: Page): Promise<void> {
  await page.getByRole('button', { name: /alternar configuración/i }).click()
  await expect(page.locator('.settings-drawer')).toHaveAttribute('data-open', 'true')
}

test('toggles the theme and keeps the selection after reload', async ({ page, accountApi }) => {
  await page.goto('/')
  await openSettings(page)

  const toggle = page.getByRole('button', { name: THEME_TOGGLE })
  await expect(toggle).toBeVisible()
  const root = page.locator('html')
  // The seeded config starts at `system`, and Playwright contexts default to
  // a light colour scheme, so the cycle is deterministic: system → light → dark.
  await expect(root).toHaveAttribute('data-theme', 'light')

  await toggle.click()
  await expect(root).toHaveAttribute('data-theme', 'light')
  await toggle.click()
  await expect(root).toHaveAttribute('data-theme', 'dark')

  await waitForPersistedConfig(accountApi, (config) => config.themePreferences.theme.mode === 'dark')
  await page.reload()
  await expect(page.getByRole('link', { name: 'Gmail' })).toBeVisible()
  await expect(root).toHaveAttribute('data-theme', 'dark')
})

test('reaches and activates the settings drawer using only the keyboard', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Gmail' })).toBeVisible()

  let found = false
  for (let i = 0; i < 15 && !found; i += 1) {
    await page.keyboard.press('Tab')
    found = await page.evaluate(
      () =>
        document.activeElement?.getAttribute('aria-label')?.toLowerCase().includes('alternar configuración') ??
        false,
    )
  }
  expect(found).toBe(true)

  await page.keyboard.press('Enter')
  await expect(page.locator('.settings-drawer')).toHaveAttribute('data-open', 'true')
  await expect(page.getByRole('button', { name: THEME_TOGGLE })).toBeVisible()
})

test('closes the settings drawer with Escape without losing the theme selection', async ({ page }) => {
  await page.goto('/')
  await openSettings(page)

  await page.getByRole('button', { name: THEME_TOGGLE }).click()
  const chosen = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))

  await page.keyboard.press('Escape')
  await expect(page.locator('.settings-drawer')).toHaveAttribute('data-open', 'false')
  expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe(chosen)
})

test('shows a visible focus indicator when tabbing to a control', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Gmail' })).toBeVisible()

  await page.keyboard.press('Tab')

  // A control is "visibly focused" if it draws either a real outline or a
  // focus ring via box-shadow — the design system uses both.
  const hasVisibleFocus = await page.evaluate(() => {
    const element = document.activeElement
    if (!element || element === document.body) {
      return false
    }
    const style = getComputedStyle(element)
    const hasOutline = style.outlineStyle !== 'none' && style.outlineWidth !== '0px'
    return hasOutline || style.boxShadow !== 'none'
  })
  expect(hasVisibleFocus).toBe(true)
})

test('keeps controls reachable and non-overlapping at tablet width', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto('/')

  await expect(page.getByRole('button', { name: /alternar configuración/i })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Gmail' })).toBeVisible()

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(hasHorizontalOverflow).toBe(false)
})
