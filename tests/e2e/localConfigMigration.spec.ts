import { expect, test } from '@playwright/test'
import { ADMIN_PASSWORD, ADMIN_USERNAME } from './testCredentials'
import { createDefaultDashboardConfig } from '../../src/config/defaults'

const DASHBOARD_CONFIG_STORAGE_KEY = 'dashboard.config.v1'

/**
 * User Story 4 (spec.md) — a pre-existing local (pre-account) dashboard
 * configuration is automatically migrated to an account on its first login,
 * exactly once, without ever overwriting a config the account already has.
 * Starts unauthenticated (overriding the pre-authenticated project default).
 */
test.use({ storageState: { cookies: [], origins: [] } })

test('a pre-existing local configuration becomes the account config on first login, with a one-time toast', async ({
  page,
}) => {
  const username = `migrationuser-${Date.now()}`
  const password = 'migration-user-password-123'
  const distinctiveLabel = `My Distinctive Bookmark ${Date.now()}`

  // Log in as admin (via API, same context) just long enough to create the
  // brand-new account this test will migrate into, then drop that session.
  const adminLogin = await page.request.post('/api/auth/login', {
    data: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
  })
  expect(adminLogin.status()).toBe(200)
  const createUser = await page.request.post('/api/auth/users', {
    data: { username, password, role: 'user' },
  })
  expect(createUser.status()).toBe(201)
  await page.context().clearCookies()

  // Simulate a pre-existing, pre-account local configuration: seed
  // localStorage with a fully valid config (so repairDashboardConfig
  // accepts it as-is) containing one distinctive, identifiable shortcut.
  const localConfig = createDefaultDashboardConfig()
  const firstShortcut = localConfig.shortcuts[0]
  if (!firstShortcut) {
    throw new Error('expected the default dashboard config to have at least one shortcut')
  }
  firstShortcut.label = distinctiveLabel
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [DASHBOARD_CONFIG_STORAGE_KEY, JSON.stringify(localConfig)] as [string, string],
  )

  await page.goto('/')
  await page.getByLabel('Usuario').fill(username)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()

  // The migrated shortcut appears, and the one-time toast confirms the import.
  await expect(page.getByRole('link', { name: distinctiveLabel })).toBeVisible()
  await expect(page.getByText('Tu configuración local se importó a tu cuenta.')).toBeVisible()

  // The original local key is renamed, never left in place (and never
  // deleted outright — a safety net per spec/plan).
  const remainingKeys = await page.evaluate(() => Object.keys(window.localStorage))
  expect(remainingKeys).not.toContain(DASHBOARD_CONFIG_STORAGE_KEY)
  expect(remainingKeys.some((key) => key.startsWith(`${DASHBOARD_CONFIG_STORAGE_KEY}.migrated.`))).toBe(true)

  // Reloading must not re-trigger migration or show the toast again — the
  // account now has a server-side row, which always wins from here on.
  await page.reload()
  await expect(page.getByRole('link', { name: distinctiveLabel })).toBeVisible()
  await expect(page.getByText('Tu configuración local se importó a tu cuenta.')).not.toBeVisible()
})
