import { expect, test, type Page } from '@playwright/test'
import { ADMIN_PASSWORD, ADMIN_USERNAME } from './testCredentials'

/**
 * User Stories 1 & 2 (spec.md) — session persistence across a full browser
 * restart, and explicit logout. Starts unauthenticated (overriding the
 * `chromium`/`firefox`/`webkit` projects' default pre-authenticated
 * `storageState` — see `playwright.config.ts`) since this spec exercises
 * the login flow itself.
 */
test.use({ storageState: { cookies: [], origins: [] } })

async function login(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByLabel('Usuario').fill(ADMIN_USERNAME)
  await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible()
}

test('a logged-in session survives closing and reopening the browser, with no login prompt (SC-001)', async ({
  browser,
}) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  await login(page)

  // Simulate "close and reopen the browser": persist cookies, close this
  // context entirely (destroying all in-memory React state), then open a
  // brand-new context/page that only reuses the cookie.
  const storageState = await context.storageState()
  await context.close()

  const newContext = await browser.newContext({ storageState })
  const newPage = await newContext.newPage()
  await newPage.goto('/')

  await expect(newPage.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible()
  await expect(newPage.getByRole('button', { name: 'Iniciar sesión' })).toHaveCount(0)

  await newContext.close()
})

test('explicit logout returns to the login screen and does not silently restore on reload (SC-002)', async ({
  page,
}) => {
  await login(page)

  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()
})

test('a wrong password shows an error and does not grant access', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Usuario').fill(ADMIN_USERNAME)
  await page.getByLabel('Contraseña').fill('definitely-the-wrong-password')
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()

  await expect(page.getByRole('alert')).toHaveText('Usuario o contraseña incorrectos.')
  await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()
})
