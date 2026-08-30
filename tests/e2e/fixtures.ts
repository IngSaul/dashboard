import {
  test as base,
  expect,
  type APIRequestContext,
  type PlaywrightWorkerArgs,
} from '@playwright/test'
import { createDefaultDashboardConfig } from '../../src/config/defaults'
import type { DashboardConfiguration } from '../../src/types/dashboard'
import { ADMIN_STORAGE_STATE_PATH, TEST_ACCOUNT_PASSWORD } from './testCredentials'

/**
 * Test isolation for the e2e suite.
 *
 * The suite used to run every spec as the one bootstrapped admin, sharing a
 * single server-side dashboard configuration across six parallel workers.
 * Clearing `localStorage` in a `beforeEach` looked like a reset but was not
 * one: once authenticated, the configuration lives in SQLite behind
 * `/api/dashboard`, so specs silently inherited whatever another spec had
 * just written (a category added here, a shortcut deleted there).
 *
 * Isolation now comes from two pieces:
 *
 * 1. **A throwaway account per worker** (`dashboardAccount`, worker-scoped).
 *    Parallel workers can no longer collide, because they are different
 *    users with different rows.
 * 2. **A configuration reset before every test** (`seededConfig`, an auto
 *    fixture). Tests within one worker run serially against the
 *    same account, so each is handed a freshly-seeded default configuration
 *    through the real `PUT /api/dashboard` — no test-only endpoint, and no
 *    reliance on browser storage.
 *
 * Account *creation* deliberately reuses the admin session saved by
 * `auth.setup.ts` instead of logging in: `POST /auth/login` is rate-limited
 * per IP, and the whole suite arrives from one loopback address.
 */

export interface DashboardAccount {
  id: number
  username: string
  password: string
}

interface AuthenticatedAccount extends DashboardAccount {
  /** Cookie jar for `username`, obtained with a single login per worker. */
  storageState: Awaited<ReturnType<APIRequestContext['storageState']>>
}

interface WorkerFixtures {
  dashboardAccount: AuthenticatedAccount
}

interface TestFixtures {
  /** API context carrying `dashboardAccount`'s session — for asserting server-side state directly. */
  accountApi: APIRequestContext
  /** The default configuration this test's account was reseeded with, before the browser opened. */
  seededConfig: DashboardConfiguration
}

/**
 * Creates a brand-new account through the admin API. Exported for the specs
 * that need a *second* identity (multi-user isolation) or an account with no
 * server-side configuration yet (local-config migration), which the shared
 * per-worker account can't provide.
 */
export async function createAccount(
  playwright: PlaywrightWorkerArgs['playwright'],
  baseURL: string,
  prefix: string,
): Promise<DashboardAccount> {
  const admin = await playwright.request.newContext({
    baseURL,
    storageState: ADMIN_STORAGE_STATE_PATH,
  })
  const credentials = { username: uniqueUsername(prefix), password: TEST_ACCOUNT_PASSWORD }
  const response = await admin.post('/api/auth/users', {
    data: { ...credentials, role: 'user' },
  })
  expect(
    response.status(),
    `failed to create e2e account ${credentials.username}: ${await response.text()}`,
  ).toBe(201)
  const created = (await response.json()) as { id: number }
  await admin.dispose()
  return { id: created.id, ...credentials }
}

/**
 * Waits until the account's server-side configuration satisfies `predicate`.
 *
 * Writes are deliberately debounced: a change schedules a `PUT /dashboard`
 * up to a second later, so a burst of edits costs one request rather than
 * twenty. A `page.reload()` issued immediately after a UI change therefore
 * races that request — and no amount of engineering removes the race, since
 * a page cannot hold up its own navigation until a network call finishes.
 *
 * So this is synchronisation with an intentional delay, not a workaround
 * for a defect. (It was originally added as the latter: before the sync
 * engine landed, a losing race meant the write was *dropped* — unordered,
 * unretried and unreported. Now a delayed write is only ever delayed; it is
 * retried until it lands and surfaced if it cannot. What the waits buy is a
 * deterministic reload, not a correct one.)
 */
export async function waitForPersistedConfig(
  api: APIRequestContext,
  predicate: (config: DashboardConfiguration) => boolean,
): Promise<void> {
  await expect
    .poll(
      async () => {
        const response = await api.get('/api/dashboard')
        if (response.status() !== 200) {
          return false
        }
        return predicate((await response.json()) as DashboardConfiguration)
      },
      { timeout: 10_000, message: 'the dashboard configuration was never persisted server-side' },
    )
    .toBe(true)
}

/** Unique across workers, projects, and repeated runs against a reused dev server. */
function uniqueUsername(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${Date.now().toString(36)}-${random}`
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  dashboardAccount: [
    async ({ playwright }, use, workerInfo) => {
      const baseURL = workerInfo.project.use.baseURL
      if (!baseURL) {
        throw new Error('playwright.config.ts must define `use.baseURL`')
      }
      const account = await createAccount(playwright, baseURL, `w${workerInfo.workerIndex}`)

      const context = await playwright.request.newContext({ baseURL })
      const login = await context.post('/api/auth/login', {
        data: { username: account.username, password: account.password },
      })
      expect(login.status(), `failed to log in as ${account.username}`).toBe(200)
      const storageState = await context.storageState()
      await context.dispose()

      await use({ ...account, storageState })
    },
    { scope: 'worker' },
  ],

  // Every browser context this suite opens starts authenticated as the
  // worker's own account, replacing the shared-admin `storageState` the
  // browser projects used to set.
  storageState: async ({ dashboardAccount }, use) => {
    await use(dashboardAccount.storageState)
  },

  accountApi: async ({ playwright, baseURL, dashboardAccount }, use) => {
    if (!baseURL) {
      throw new Error('playwright.config.ts must define `use.baseURL`')
    }
    const context = await playwright.request.newContext({
      baseURL,
      storageState: dashboardAccount.storageState,
    })
    await use(context)
    await context.dispose()
  },

  seededConfig: [
    async ({ accountApi, dashboardAccount }, use) => {
      const config = createDefaultDashboardConfig()
      // Carries the same account precondition the app's own writes do, so
      // the reset exercises the real contract rather than a looser one.
      const response = await accountApi.put('/api/dashboard', {
        data: config,
        headers: { 'X-Dashboard-Account': String(dashboardAccount.id) },
      })
      expect(response.status(), 'failed to reset the account dashboard config').toBe(200)
      await use(config)
    },
    { auto: true },
  ],
})

/**
 * For specs that drive the login flow itself: same per-worker account and
 * same pre-test configuration reset, but the browser starts with no session
 * so the login screen is what renders.
 */
export const anonymousTest = test.extend({
  // Playwright works out a fixture's dependencies by parsing this parameter's
  // destructuring pattern, so it has to stay an object pattern even when the
  // fixture depends on nothing.
  // eslint-disable-next-line no-empty-pattern -- see above
  storageState: async ({}, use) => {
    await use({ cookies: [], origins: [] })
  },
})

export { expect }
