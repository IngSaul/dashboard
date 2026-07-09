import { expect, test } from '@playwright/test'

/**
 * Desktop/tablet responsive validation for User Story 3 (UI contract's
 * Responsive Layout section: no overlapping text/controls, no hidden
 * required actions). Targets the ThemeToggle control that doesn't exist
 * yet (T052); expected to fail until User Story 3 lands.
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
})

test.describe('Desktop layout', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('shows all primary controls without horizontal overflow', async ({ page }) => {
    await expect(page.getByRole('search')).toBeVisible()
    await expect(page.getByRole('button', { name: /toggle theme/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /manage shortcuts/i })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Gmail' })).toBeVisible()

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(hasHorizontalOverflow).toBe(false)
  })
})

test.describe('Tablet layout', () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test('keeps all primary controls visible and reachable without overflow', async ({ page }) => {
    await expect(page.getByRole('search')).toBeVisible()
    await expect(page.getByRole('button', { name: /toggle theme/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /manage shortcuts/i })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Gmail' })).toBeVisible()

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(hasHorizontalOverflow).toBe(false)
  })

  test('does not overlap the search bar with the theme toggle', async ({ page }) => {
    const searchBox = await page.getByRole('search').boundingBox()
    const themeToggleBox = await page.getByRole('button', { name: /toggle theme/i }).boundingBox()
    expect(searchBox).not.toBeNull()
    expect(themeToggleBox).not.toBeNull()
    if (!searchBox || !themeToggleBox) return

    const overlaps =
      searchBox.x < themeToggleBox.x + themeToggleBox.width &&
      searchBox.x + searchBox.width > themeToggleBox.x &&
      searchBox.y < themeToggleBox.y + themeToggleBox.height &&
      searchBox.y + searchBox.height > themeToggleBox.y
    expect(overlaps).toBe(false)
  })

  test('reflows the shortcut grid without clipping cards off-screen', async ({ page }) => {
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
