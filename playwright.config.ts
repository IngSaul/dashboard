import { defineConfig, devices } from '@playwright/test'
import { ADMIN_PASSWORD, ADMIN_USERNAME, STORAGE_STATE_PATH } from './tests/e2e/testCredentials.ts'

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
        ADMIN_USERNAME,
        ADMIN_PASSWORD,
        DATABASE_PATH: ':memory:',
        COOKIE_SECURE: 'false',
        PORT: '3210',
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
      // Logs in once as the bootstrapped admin and saves the resulting
      // session cookie so every other project starts already authenticated
      // — existing specs (firstLaunch, personalization, responsive, ...)
      // need zero changes to keep exercising dashboard behavior post-login.
      // Auth-specific specs (tests/e2e/auth*.spec.ts) override storageState
      // to start unauthenticated, since they test the login flow itself.
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE_PATH },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], storageState: STORAGE_STATE_PATH },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], storageState: STORAGE_STATE_PATH },
      dependencies: ['setup'],
    },
  ],
})
