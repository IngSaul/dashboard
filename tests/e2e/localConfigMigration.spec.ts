import { anonymousTest as test, createAccount, expect } from './fixtures'
import { createDefaultDashboardConfig } from '../../src/config/defaults'

const DASHBOARD_CONFIG_STORAGE_KEY = 'dashboard.config.v1'

/**
 * A pre-existing local (pre-account) dashboard configuration is migrated to
 * an account on its first login, exactly once, without ever overwriting a
 * config the account already has.
 *
 * Needs an account with *no* server-side row, which the shared per-worker
 * account (reseeded before every test) can't be — so this spec creates its
 * own throwaway account through `createAccount`.
 */

test('a pre-existing local configuration becomes the account config on first login, with a one-time toast', async ({
  playwright,
  baseURL,
  page,
}) => {
  if (!baseURL) {
    throw new Error('playwright.config.ts must define `use.baseURL`')
  }
  const account = await createAccount(playwright, baseURL, 'migration')
  const distinctiveLabel = `My Distinctive Bookmark ${Date.now()}`

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
  await page.getByLabel('Usuario').fill(account.username)
  await page.getByLabel('Contraseña').fill(account.password)
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
