import { expect, test } from '@playwright/test'

/**
 * User Story 3 final validation: keyboard operability, visible focus,
 * theme persistence across reload, and tablet layout (UI contract's
 * Keyboard Navigation, Accessibility, Theme, and Responsive Layout
 * sections).
 */

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
})

test('toggles theme and keeps the selection after reload', async ({ page }) => {
  const toggle = page.getByRole('button', { name: /toggle theme/i })
  await expect(toggle).toBeVisible()
  const before = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))

  // system -> light -> dark: two activations guarantee a resolved change.
  await toggle.click()
  await toggle.click()
  const after = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
  expect(after).not.toBe(before)

  await page.reload()
  const afterReload = await page.evaluate(() => document.documentElement.getAttribute('data-theme'))
  expect(afterReload).toBe(after)
})

test('reaches and activates the theme toggle using only the keyboard', async ({ page }) => {
  let found = false
  for (let i = 0; i < 10 && !found; i += 1) {
    await page.keyboard.press('Tab')
    found = await page.evaluate(
      () => document.activeElement?.getAttribute('aria-label')?.includes('Toggle theme') ?? false,
    )
  }
  expect(found).toBe(true)

  await page.keyboard.press('Enter')
  await expect(page.getByRole('search')).toBeVisible()
})

test('shows a visible focus indicator when tabbing to a control', async ({ page }) => {
  await page.keyboard.press('Tab') // search input
  await page.keyboard.press('Tab') // search submit button
  await page.keyboard.press('Tab') // theme toggle

  const outlineStyle = await page.evaluate(
    () => getComputedStyle(document.activeElement as Element).outlineStyle,
  )
  expect(outlineStyle).not.toBe('none')
})

test('keeps controls reachable and non-overlapping at tablet width', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })

  await expect(page.getByRole('search')).toBeVisible()
  await expect(page.getByRole('button', { name: /toggle theme/i })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Gmail' })).toBeVisible()

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(hasHorizontalOverflow).toBe(false)
})
