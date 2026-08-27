import { test as setup, expect } from '@playwright/test'
import { ADMIN_PASSWORD, ADMIN_USERNAME, STORAGE_STATE_PATH } from './testCredentials'

/**
 * Runs once before the `chromium`/`firefox`/`webkit` projects (see
 * `playwright.config.ts`'s `dependencies`), logging in as the bootstrapped
 * admin and saving the session cookie to `STORAGE_STATE_PATH` — every
 * other e2e spec then starts already authenticated, needing no changes of
 * its own to exercise dashboard behavior post-login (003-auth-persistence).
 */
setup('authenticate as the bootstrapped admin', async ({ page }) => {
  await page.goto('/')

  await page.getByLabel('Usuario').fill(ADMIN_USERNAME)
  await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()

  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible()

  await page.context().storageState({ path: STORAGE_STATE_PATH })
})
