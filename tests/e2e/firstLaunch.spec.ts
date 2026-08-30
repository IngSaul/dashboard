import { expect, test } from './fixtures'

/**
 * First-launch validation for the architecture that actually ships today
 * (002-widget-dashboard): a fresh account renders its default widgets —
 * clock and shortcuts — immediately, with nothing else competing for
 * attention, and web search is reachable from the command palette.
 *
 * The feature-001 shape this spec used to assert (a page-level `role=search`
 * bar and a standalone date/time region) no longer exists: `CenterColumn`
 * documents why there is no in-page search box, and date/time now renders
 * inside `ClockWidget`. Those assertions were rewritten against the real UI
 * rather than the app being changed back to satisfy them.
 */

test('renders the default clock and shortcut widgets within one second of load', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('group', { name: 'Fecha y hora actual' })).toBeVisible({ timeout: 1000 })
  await expect(page.getByRole('link', { name: 'Gmail' })).toBeVisible({ timeout: 1000 })
})

test('enables only the clock and shortcuts widgets by default', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('[data-widget-type="clock"]')).toBeVisible()
  await expect(page.locator('[data-widget-type="shortcuts"]')).toBeVisible()
  await expect(page.locator('.widget-slot')).toHaveCount(2)
})

test('contains no advertisements, iframes, or other unrelated content', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('iframe')).toHaveCount(0)
  await expect(page.locator('[class*="ad-"], [id*="ad-"]')).toHaveCount(0)
})

test('submits a web search from the command palette to the configured destination', async ({ page }) => {
  await page.route('https://www.google.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>stub</body></html>' }),
  )
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Gmail' })).toBeVisible()

  await page.keyboard.press('ControlOrMeta+k')
  const palette = page.getByRole('dialog', { name: 'Paleta de comandos' })
  await expect(palette).toBeVisible()

  await palette.getByRole('combobox').fill('react testing')
  await palette.getByRole('option', { name: /Buscar en la web/ }).click()

  await page.waitForURL(/google\.com\/search\?q=react/)
})

test('finds an existing shortcut by name in the command palette', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Gmail' })).toBeVisible()

  await page.keyboard.press('ControlOrMeta+k')
  const palette = page.getByRole('dialog', { name: 'Paleta de comandos' })
  await palette.getByRole('combobox').fill('Gmail')

  await expect(palette.getByRole('option', { name: 'Gmail', exact: true })).toBeVisible()
})
