/**
 * Shared between `playwright.config.ts` (backend `webServer` env) and
 * `auth.setup.ts` (the login it performs to seed `ADMIN_STORAGE_STATE_PATH`)
 * — a single source of truth so the two never drift apart.
 *
 * The bootstrapped admin is *only* an API credential for the suite now: it
 * exists so `fixtures.ts` can create a throwaway account per worker without
 * spending a login on it. No spec drives the UI as the admin, and no spec
 * mutates the admin's own dashboard configuration.
 */
export const ADMIN_USERNAME = 'admin'
export const ADMIN_PASSWORD = 'e2e-test-admin-password-123'
export const ADMIN_STORAGE_STATE_PATH = 'playwright/.auth/admin.json'

/** Password given to every per-worker throwaway account (see `fixtures.ts`). */
export const TEST_ACCOUNT_PASSWORD = 'e2e-worker-account-password-123'
