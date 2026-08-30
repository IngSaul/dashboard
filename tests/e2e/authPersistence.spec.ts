import { anonymousTest as test, expect, type DashboardAccount } from './fixtures'
import type { Page } from '@playwright/test'

/**
 * Session persistence across a full browser restart, and explicit logout.
 * Starts unauthenticated (`anonymousTest`) since this spec exercises the
 * login flow itself, and drives the worker's own throwaway account rather
 * than the shared bootstrapped admin — a failed login here can no longer
 * lock out the account every other spec depends on.
 */

async function login(page: Page, account: DashboardAccount): Promise<void> {
  await page.goto('/')
  await page.getByLabel('Usuario').fill(account.username)
  await page.getByLabel('Contraseña').fill(account.password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible()
}

test('a logged-in session survives closing and reopening the browser, with no login prompt (SC-001)', async ({
  browser,
  dashboardAccount,
}) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const page = await context.newPage()
  await login(page, dashboardAccount)

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
  dashboardAccount,
}) => {
  await login(page, dashboardAccount)

  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()
})

test('a wrong password shows an error and does not grant access', async ({ page, dashboardAccount }) => {
  await page.goto('/')
  await page.getByLabel('Usuario').fill(dashboardAccount.username)
  await page.getByLabel('Contraseña').fill('definitely-the-wrong-password')
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()

  await expect(page.getByRole('alert')).toHaveText('Usuario o contraseña incorrectos.')
  await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()
})
