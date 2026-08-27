import { expect, test } from '@playwright/test'

/**
 * User Story 3 (spec.md) — two accounts' dashboard configurations are fully
 * isolated, both while both are in concurrent use and after logging back
 * in later. Uses the default pre-authenticated admin context (see
 * `playwright.config.ts`'s `storageState`) to create a second account via
 * the API, then drives that second account from its own, separately
 * authenticated browser context.
 */
test('two accounts configure their dashboards independently, with no cross-contamination', async ({
  page,
  browser,
}) => {
  const username = `seconduser-${Date.now()}`
  const password = 'second-user-password-123'

  // `page.request` shares this (already-authenticated-as-admin) context's
  // session cookie, so this call is authorized without any extra login.
  const createResponse = await page.request.post('/api/auth/users', {
    data: { username, password, role: 'user' },
  })
  expect(createResponse.status()).toBe(201)

  // Second account: entirely separate, freshly-authenticated browser context.
  // `browser.newContext()` with no options inherits this project's default
  // `storageState` (the admin session) — must be overridden explicitly to
  // start genuinely unauthenticated. See auth.setup.ts / playwright.config.ts.
  const secondContext = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const secondPage = await secondContext.newPage()
  await secondPage.goto('/')
  await secondPage.getByLabel('Usuario').fill(username)
  await secondPage.getByLabel('Contraseña').fill(password)
  await secondPage.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(secondPage.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible()

  const adminConfigBefore = (await (await page.request.get('/api/dashboard')).json()) as { version: number }

  const adminUpdate = { ...adminConfigBefore, updatedAt: 'admin-marker' }
  const secondUpdate = { ...adminConfigBefore, updatedAt: 'second-user-marker' }

  const adminPut = await page.request.put('/api/dashboard', { data: adminUpdate })
  expect(adminPut.status()).toBe(200)
  const secondPut = await secondPage.request.put('/api/dashboard', { data: secondUpdate })
  expect(secondPut.status()).toBe(200)

  const adminAfter = (await (await page.request.get('/api/dashboard')).json()) as { updatedAt: string }
  const secondAfter = (await (await secondPage.request.get('/api/dashboard')).json()) as { updatedAt: string }

  expect(adminAfter.updatedAt).toBe('admin-marker')
  expect(secondAfter.updatedAt).toBe('second-user-marker')

  await secondContext.close()

  // Admin's own session/config is unaffected by the second account existing.
  const adminMe = await page.request.get('/api/auth/me')
  expect(adminMe.status()).toBe(200)
  const adminFinal = (await (await page.request.get('/api/dashboard')).json()) as { updatedAt: string }
  expect(adminFinal.updatedAt).toBe('admin-marker')
})
