import { expect, test } from '@playwright/test'

/**
 * User Story 2 personalization validation: add/edit/remove shortcuts and
 * verify the changes survive a real page reload (FR-008, FR-009, FR-010,
 * FR-011, and the UI contract's shortcuts/categories and persistence
 * sections).
 */

test.beforeEach(async ({ page }) => {
  // `addInitScript` re-runs on every navigation, including the in-test
  // `page.reload()` calls below, which would wipe out the very changes
  // being verified. Clear storage once and reload so each test starts from
  // a clean, default configuration without re-clearing on later reloads.
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
})

test('adds a shortcut and keeps it after reload', async ({ page }) => {
  await page.getByRole('button', { name: /manage shortcuts/i }).click()
  await page.getByRole('textbox', { name: /label/i }).fill('Docs')
  await page.getByRole('textbox', { name: /url/i }).fill('https://docs.example.com')
  await page.getByRole('button', { name: /add shortcut/i }).click()

  await expect(page.getByRole('link', { name: 'Docs' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('link', { name: 'Docs' })).toBeVisible()
})

test('removes a shortcut and keeps it removed after reload', async ({ page }) => {
  await page.getByRole('button', { name: /manage shortcuts/i }).click()
  await page.getByRole('button', { name: 'Remove Gmail' }).click()

  await expect(page.getByRole('link', { name: 'Gmail' })).toHaveCount(0)

  await page.reload()
  await expect(page.getByRole('link', { name: 'Gmail' })).toHaveCount(0)
})

test('edits a shortcut label and keeps the change after reload', async ({ page }) => {
  await page.getByRole('button', { name: /manage shortcuts/i }).click()
  await page.getByRole('button', { name: 'Edit Gmail' }).click()
  await page.getByRole('textbox', { name: /label/i }).fill('Mail')
  await page.getByRole('button', { name: /save shortcut/i }).click()

  await expect(page.getByRole('link', { name: 'Mail' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('link', { name: 'Mail' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Gmail' })).toHaveCount(0)
})

test('filters shortcuts by category', async ({ page }) => {
  await page.getByRole('button', { name: 'General' }).click()

  await expect(page.getByRole('link', { name: 'Gmail' })).toBeVisible()
})
