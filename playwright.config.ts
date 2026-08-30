import { defineConfig, devices } from '@playwright/test'
import { ADMIN_PASSWORD, ADMIN_USERNAME } from './tests/e2e/testCredentials.ts'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: [
    {
      // 003-auth-persistence backend, in-memory DB (fresh per test run, no
      // artifacts left on disk) — see specs/003-auth-persistence/quickstart.md.
      command: 'npm run dev --workspace=server',
      url: 'http://127.0.0.1:3210/healthz',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        // Explicit, not inherited: a production backend refuses to start
        // without COOKIE_SECURE=true, and Playwright merges the developer's
        // own environment into this one.
        NODE_ENV: 'test',
        ADMIN_USERNAME,
        ADMIN_PASSWORD,
        DATABASE_PATH: ':memory:',
        COOKIE_SECURE: 'false',
        PORT: '3210',
        // One login per worker per project (see tests/e2e/fixtures.ts), all
        // from a single loopback address — far above the brute-force default
        // a real deployment wants, and unrelated to it.
        LOGIN_RATE_LIMIT_MAX: '1000',
      },
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 4173',
      url: 'http://127.0.0.1:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      // Saves an admin session the browser projects never run under: it is
      // only the credential `tests/e2e/fixtures.ts` uses to create each
      // worker's throwaway account via the admin-only POST /auth/users.
      // Specs get their session from the `storageState` fixture instead.
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
    },
  ],
})
