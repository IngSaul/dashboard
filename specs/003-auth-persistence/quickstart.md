# Quickstart: Multiuser Authentication & Real Persistence

Validation guide for this feature. Covers both local development (frontend `npm run dev` +
backend `npm run dev --workspace=server`) and the full Docker Compose deployment. See
[contracts/api-contract.md](./contracts/api-contract.md) for the exact endpoints and
[data-model.md](./data-model.md) for the schema referenced below.

## Prerequisites

- Root `npm install` (sets up both the frontend and the `server` workspace).
- `server/.env` (or exported env vars) with at least `ADMIN_USERNAME` and `ADMIN_PASSWORD` set —
  see plan.md's env var list for the full set (`COOKIE_SECURE`, `SESSION_IDLE_TTL_DAYS`,
  `SESSION_ABSOLUTE_TTL_DAYS`, `DATABASE_PATH`, `PORT`).
- For the Docker path: `docker compose build`.

## Scenario 1 — First login, configure, survive a full browser restart (US1, spec Acceptance 1)

1. Start fresh (delete any local `./data/dashboard.sqlite3` and clear the browser's site data for
   the dashboard's origin).
2. Start backend + frontend (or `docker compose up -d --build`).
3. Visit the dashboard. **Expect**: a loading state, then the login screen — never a flash of the
   dashboard itself (FR-008).
4. Log in with `ADMIN_USERNAME`/`ADMIN_PASSWORD`.
5. Change the theme, add a shortcut, rearrange widgets, set a wallpaper.
6. Fully quit the browser process (not just the tab), then relaunch it and revisit the dashboard.
7. **Expect**: the exact configuration from step 5 is restored, with no login prompt (SC-001).

## Scenario 2 — Explicit logout (US2, spec Acceptance 2)

1. While logged in, use the logout action.
2. **Expect**: immediate return to the login screen.
3. Reload the page.
4. **Expect**: login screen persists — the session was not silently restored (SC-002).

## Scenario 3 — Two independent accounts (US3, spec Acceptance 3)

1. As the admin, create a second account via `POST /auth/users` (or an admin UI action calling it).
2. Log in as the second account in a separate browser profile (or after logging out of the first).
3. Configure it differently from the admin's dashboard (opposite theme, different shortcuts).
4. Log back into the first account.
5. **Expect**: the first account's configuration is untouched by the second account's changes
   (SC-003).

## Scenario 4 — Local-config migration (US4)

1. Before any account has a server-side config, use the dashboard's existing settings UI in a
   browser with no active session (or temporarily point `RemoteStorageProvider` off) to populate
   `localStorage`'s `dashboard.config.v1` with some configuration.
2. Log in with an account that has never saved a config to the server (`GET /dashboard` would 404).
3. **Expect**: the dashboard immediately reflects the previously-local configuration, a one-time
   toast confirms the import, and `localStorage` now holds a renamed
   `dashboard.config.v1.migrated.<timestamp>` key instead of the original (SC-005).
4. Reload. **Expect**: no duplicate migration occurs and no toast reappears.

## Scenario 5 — Docker data survival (US1/US3, spec Acceptance 4 & 5)

1. With accounts and configs already created, run `docker compose down`.
2. Run `docker compose up -d`.
3. **Expect**: all accounts, unexpired sessions, and dashboard configurations are unchanged
   (SC-004) — log in without re-creating any account.
4. Remove and recreate only the application containers (`docker compose up -d --force-recreate`,
   without `-v` and without touching `./data`).
5. **Expect**: identical result — data survives container recreation as long as `./data` is intact.

## Scenario 6 — Brute-force lockout (spec Edge Cases, SC-007)

1. Attempt to log in with a valid username and a wrong password 10 times in a row.
2. **Expect**: the 10th attempt (or the first attempt after it) returns `423 Locked`
   (`retryAfterSeconds` present) rather than continuing to accept guesses.
3. Wait 15 minutes (or adjust `SESSION_IDLE_TTL_DAYS`-adjacent lockout constant in a test build),
   then log in with the correct password.
4. **Expect**: login succeeds normally once the lockout window has elapsed.

## Scenario 7 — Debounced writes during drag (FR-009, SC-006)

1. Open browser dev tools' network tab.
2. Drag a widget continuously through several intermediate positions over a few seconds, then
   drop it.
3. **Expect**: a small, bounded number of `PUT /dashboard` requests fire (not one per intermediate
   frame), and the final persisted state (confirmed via `GET /dashboard` or a reload) matches the
   dropped position.
