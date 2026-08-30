import { createAccount, expect, test } from './fixtures'

/**
 * Two accounts' dashboard configurations stay fully isolated, both while
 * both are in concurrent use and after logging back in later. The first
 * account is this worker's own (already authenticated via the
 * `storageState` fixture); the second is created for this test and driven
 * from its own browser context.
 */
test('two accounts configure their dashboards independently, with no cross-contamination', async ({
  page,
  browser,
  playwright,
  baseURL,
  accountApi,
}) => {
  if (!baseURL) {
    throw new Error('playwright.config.ts must define `use.baseURL`')
  }
  const secondAccount = await createAccount(playwright, baseURL, 'isolation')

  // Second account: entirely separate, freshly-authenticated browser context.
  const secondContext = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const secondPage = await secondContext.newPage()
  await secondPage.goto('/')
  await secondPage.getByLabel('Usuario').fill(secondAccount.username)
  await secondPage.getByLabel('Contraseña').fill(secondAccount.password)
  await secondPage.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(secondPage.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible()

  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Gmail' })).toBeVisible()

  const firstConfig = (await (await accountApi.get('/api/dashboard')).json()) as { version: number }

  const firstUpdate = { ...firstConfig, updatedAt: 'first-account-marker' }
  const secondUpdate = { ...firstConfig, updatedAt: 'second-account-marker' }

  const firstPut = await accountApi.put('/api/dashboard', { data: firstUpdate })
  expect(firstPut.status()).toBe(200)
  const secondPut = await secondPage.request.put('/api/dashboard', { data: secondUpdate })
  expect(secondPut.status()).toBe(200)

  const firstAfter = (await (await accountApi.get('/api/dashboard')).json()) as { updatedAt: string }
  const secondAfter = (await (await secondPage.request.get('/api/dashboard')).json()) as {
    updatedAt: string
  }

  expect(firstAfter.updatedAt).toBe('first-account-marker')
  expect(secondAfter.updatedAt).toBe('second-account-marker')

  await secondContext.close()

  // The first account's own session/config is unaffected by the second existing.
  const firstMe = await accountApi.get('/api/auth/me')
  expect(firstMe.status()).toBe(200)
  const firstFinal = (await (await accountApi.get('/api/dashboard')).json()) as { updatedAt: string }
  expect(firstFinal.updatedAt).toBe('first-account-marker')
})
