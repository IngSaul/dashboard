import { expect, test } from '@playwright/test'

/**
 * T099: three-column `AppShell`/`Workspace` responsive reflow (desktop →
 * tablet) and reduced-motion behavior. Unlike the feature-001-era
 * `responsive.spec.ts`/`accessibilityAndTheme.spec.ts` (which target a
 * main-chrome "Toggle theme"/"Manage shortcuts" button that doesn't exist
 * in this architecture — `ThemeToggle` only lives inside `SettingsDrawer`),
 * this spec targets controls that actually exist today: the settings-drawer
 * toggle and the default clock/shortcuts widgets. `SearchBar` was removed
 * (no WebExtensions API lets a page focus or write into the browser's own
 * address bar), so it's no longer part of this layout.
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear())
})

test.describe('Desktop layout', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('lays out the three workspace columns without horizontal overflow', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('button', { name: /alternar configuración/i })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Gmail' })).toBeVisible()
    await expect(page.locator('.workspace-column')).toHaveCount(3)

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(hasHorizontalOverflow).toBe(false)
  })
})

test.describe('Tablet layout', () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test('keeps primary controls visible and reachable without overflow', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('button', { name: /alternar configuración/i })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Gmail' })).toBeVisible()

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(hasHorizontalOverflow).toBe(false)
  })

  test('reflows the shortcut grid without clipping cards off-screen', async ({ page }) => {
    await page.goto('/')

    const githubLink = page.getByRole('link', { name: 'GitHub' })
    await expect(githubLink).toBeVisible()
    const box = await githubLink.boundingBox()
    const viewport = page.viewportSize()
    expect(box).not.toBeNull()
    expect(viewport).not.toBeNull()
    if (!box || !viewport) return

    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1)
  })
})

test.describe('Reduced motion', () => {
  test('collapses the settings drawer slide-in transition to near-zero duration', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')

    const drawer = page.locator('.settings-drawer')
    const transitionDurationSeconds = await drawer.evaluate((element) => {
      const raw = getComputedStyle(element).transitionDuration
      return raw.endsWith('ms') ? parseFloat(raw) / 1000 : parseFloat(raw)
    })
    expect(transitionDurationSeconds).toBeLessThan(0.001)
  })

  test('still opens and closes the settings drawer with reduced motion enabled', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')

    const toggle = page.getByRole('button', { name: /alternar configuración/i })
    await toggle.click()
    await expect(page.locator('.settings-drawer')).toHaveAttribute('data-open', 'true')

    await page.getByRole('button', { name: /cerrar configuración/i }).click()
    await expect(page.locator('.settings-drawer')).toHaveAttribute('data-open', 'false')
  })
})
