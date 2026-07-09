import { expect, test } from '@playwright/test'

/**
 * User Story 1 first-launch validation: search, date/time, weather status,
 * and shortcuts are usable quickly and without unrelated content (SC-001,
 * SC-007, SC-008, and the UI contract's launch section).
 */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear())
})

test('shows search, date/time, and shortcuts within one second of load', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('search')).toBeVisible({ timeout: 1000 })
  await expect(
    page.getByRole('group', { name: /current date and time/i }),
  ).toBeVisible({ timeout: 1000 })
  await expect(page.getByRole('link', { name: 'Gmail' })).toBeVisible({ timeout: 1000 })
})

test('shows a calm weather status without blocking the rest of the dashboard', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('status')).toBeVisible()
  await expect(page.getByRole('search')).toBeVisible()
  await expect(page.getByRole('link', { name: 'GitHub' })).toBeVisible()
})

test('contains no advertisements, iframes, or other unrelated content', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('iframe')).toHaveCount(0)
  await expect(page.locator('[class*="ad-"], [id*="ad-"]')).toHaveCount(0)
})

test('submits a non-empty search query to the configured destination', async ({ page }) => {
  await page.route('https://www.google.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>stub</body></html>' }),
  )
  await page.goto('/')

  await page.getByRole('textbox', { name: /search/i }).fill('react testing')
  await page.getByRole('button', { name: /search/i }).click()

  await page.waitForURL(/google\.com\/search\?q=react/)
})

test('ignores an empty search submission without navigating away', async ({ page }) => {
  await page.goto('/')
  const urlBefore = page.url()

  await page.getByRole('button', { name: /search/i }).click()

  expect(page.url()).toBe(urlBefore)
  await expect(page.getByRole('search')).toBeVisible()
})
