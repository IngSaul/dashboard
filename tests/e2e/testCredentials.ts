/**
 * Shared between `playwright.config.ts` (backend `webServer` env) and
 * `auth.setup.ts` (the login it performs to seed `STORAGE_STATE_PATH`) —
 * a single source of truth so the two never drift apart.
 */
export const ADMIN_USERNAME = 'admin'
export const ADMIN_PASSWORD = 'e2e-test-admin-password-123'
export const STORAGE_STATE_PATH = 'playwright/.auth/admin.json'
