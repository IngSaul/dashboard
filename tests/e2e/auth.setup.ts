import { test as setup, expect } from '@playwright/test'
import { ADMIN_PASSWORD, ADMIN_STORAGE_STATE_PATH, ADMIN_USERNAME } from './testCredentials'

/**
 * Runs once before the browser projects (see `playwright.config.ts`'s
 * `dependencies`), logging in as the bootstrapped admin and saving the
 * session to `ADMIN_STORAGE_STATE_PATH`.
 *
 * That state is *not* the state specs run under — every spec gets its own
 * throwaway account via `fixtures.ts`. It exists purely so each worker can
 * call the admin-only `POST /auth/users` without spending its own login on
 * it, which keeps the suite comfortably under the backend's per-IP login
 * rate limit.
 */
setup('authenticate as the bootstrapped admin', async ({ page }) => {
  await page.goto('/')

  await page.getByLabel('Usuario').fill(ADMIN_USERNAME)
  await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()

  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible()

  await page.context().storageState({ path: ADMIN_STORAGE_STATE_PATH })
})
