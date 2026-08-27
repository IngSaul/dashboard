# Tasks: Multiuser Authentication & Real Persistence

**Input**: Design documents from `/specs/003-auth-persistence/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/api-contract.md](./contracts/api-contract.md), [quickstart.md](./quickstart.md)

**Tests**: Included per the project constitution and this repo's own convention (`CLAUDE.md`: "write the test first and confirm it fails, then implement types/config/services before UI") — business logic (auth, sessions, migration, debounce/cache) gets unit tests; route behavior gets Fastify-`inject()` tests; user-visible flows get integration/e2e coverage.

**Organization**: Tasks are grouped by user story (from spec.md: US1/US2/US3 are P1, US4 is P2, US5 is P3). Because every story requires a working login → session-check → config-hydration path before `AppShell` can render at all (plan.md's documented Constitution III exception), the backend (DB, password/session/lockout logic, core auth routes, dashboard config routes) and the frontend auth gate (`AuthProvider`/`AuthGate`/`LoginScreen`/`RemoteStorageProvider`) are Foundational — none of them are optional extras for a later story, they are the shared substrate every story runs on top of. Each user story phase then adds the behavior/tests specific to that story's acceptance scenarios.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US5)
- Exact file paths are included in each description

## Path Conventions

Frontend extends the existing React start page in place (`src/components/`, `src/services/`, `src/state/`, `src/types/`, `tests/unit/`, `tests/integration/`, `tests/e2e/`). Backend is a new npm workspace at `server/` (own `src/`, `test/`), independent of the frontend bundle — see [plan.md's Project Structure](./plan.md#project-structure).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the new backend workspace and clear the way for it in the existing repo.

- [X] T001 Delete the existing empty, unreferenced `client/` directory at the repo root
- [X] T002 Add `"workspaces": ["server"]` to the root `package.json`
- [X] T003 Create `server/package.json` with dependencies (`fastify`, `@fastify/cookie`, `@fastify/cors`, `@fastify/rate-limit`, `@fastify/helmet`, `better-sqlite3`, `argon2`, `zod`, `fastify-type-provider-zod`) and devDependencies (`typescript`, `vitest`, `@types/node`, `@types/better-sqlite3`)
- [X] T004 [P] Create `server/tsconfig.json` (strict Node-targeted config: `NodeNext` module/resolution, ES2023 target, matching the root config's strictness flags)
- [X] T005 [P] Create `server/vitest.config.ts` (`environment: 'node'`, `include: ['test/**/*.test.ts']`, fully independent of the root `vitest.config.ts`)
- [X] T006 [P] Add root script `"test:server": "npm test --workspace=server"` in `package.json`
- [X] T007 Run `npm install` at the repo root to link the new `server` workspace and confirm it resolves

**Checkpoint**: `server/` exists as a working, empty TypeScript+Vitest workspace; the frontend is untouched.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, password/session/lockout logic, the core auth + dashboard-config API, admin bootstrap, and the frontend's auth gate + remote storage provider. Nothing in any user story can be demonstrated — not even "log in" — without this phase, because `AppShell` cannot mount until session-check and config-hydration both resolve (plan.md's documented exception to Principle III).

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Backend: types, env, database

- [X] T008 [P] Define `User`, `Session`, `DashboardConfigRecord`, `AuthenticatedUser` types in `server/src/types.ts` per [data-model.md](./data-model.md) — no `any`
- [X] T009 [P] Implement typed env var parsing (`zod`) for `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `COOKIE_SECURE`, `SESSION_IDLE_TTL_DAYS`, `SESSION_ABSOLUTE_TTL_DAYS`, `DATABASE_PATH`, `PORT`, `NODE_ENV` in `server/src/env.ts`
- [X] T010 Implement `server/src/db/connection.ts` (opens `better-sqlite3` at `DATABASE_PATH`, sets `PRAGMA foreign_keys = ON` and `journal_mode = WAL`) (depends on T009)
- [X] T011 Implement `server/src/db/migrate.ts` with `CREATE TABLE IF NOT EXISTS` DDL for `users`, `sessions`, `dashboard_configs` per [data-model.md](./data-model.md) (depends on T010)
- [X] T012 [P] Unit test `migrate.ts` against a `:memory:` database — confirms all three tables and their constraints (unique username, unique token_hash, FK cascade) exist after running in `server/test/migrate.test.ts` (depends on T011)

### Backend: auth primitives

- [X] T013 [P] Implement `server/src/auth/password.ts` (`hashPassword`/`verifyPassword` using `argon2id`, `timeCost:3, memoryCost:19456, parallelism:1`)
- [X] T014 [P] Unit test `password.ts` hash/verify round-trip and rejection of a wrong password in `server/test/password.test.ts` (depends on T013)
- [X] T015 [P] Implement `server/src/auth/session.ts` (`createSession`, `validateSessionToken`, `touchSession` (sliding 30d/absolute 90d cap, throttled to once/hour), `deleteSession`, `sweepExpiredSessions`) using `crypto.randomBytes(32)` → base64url token, storing only `sha256(token)` (depends on T011)
- [X] T016 [P] Unit test `session.ts`: create/validate a fresh token, reject an unknown/expired token, `touchSession` extends `expires_at` up to but not past the absolute cap, `deleteSession` invalidates immediately, `sweepExpiredSessions` removes only expired rows in `server/test/session.test.ts` (depends on T015)
- [X] T017 [P] Implement `server/src/auth/lockout.ts` (`recordFailedLogin`, `isLocked`, `clearLockout` — locks for 15 minutes after 10 consecutive failures, per spec FR-014) (depends on T011)
- [X] T018 [P] Unit test `lockout.ts`: 10th consecutive failure locks the account, `isLocked` reports true with a `retryAfterSeconds`, a successful login before the 10th failure resets the counter, lock clears automatically once the window elapses in `server/test/lockout.test.ts` (depends on T017)
- [X] T019 Implement `server/src/db/bootstrapAdmin.ts` (idempotent: inserts the admin row from `ADMIN_USERNAME`/`ADMIN_PASSWORD` only if no `role='admin'` row exists yet) (depends on T011, T013)
- [X] T020 [P] Unit test `bootstrapAdmin.ts`: creates the admin on an empty database, is a no-op on a database that already has an admin, in `server/test/bootstrapAdmin.test.ts` (depends on T019)

### Backend: Fastify app, auth routes, dashboard routes

- [X] T021 Implement `server/src/plugins/authenticate.ts` (`preHandler` hook: reads the `dashboard_session` cookie, validates via `session.ts`, attaches `request.user`, else responds `401 {"error":"unauthenticated"}`) (depends on T015)
- [X] T022 [P] Define `zod` request/response schemas for login, me, and user-creation in `server/src/auth/schema.ts` per [contracts/api-contract.md](./contracts/api-contract.md)
- [X] T023 [P] Define `zod` structural validation schema (size cap, shape check against `schema_version`) for the dashboard config payload in `server/src/dashboard/schema.ts`
- [X] T024 Implement `server/src/app.ts` (`buildApp(deps)` factory: registers `@fastify/cookie`, `@fastify/cors` (locked to same-origin by default), `@fastify/rate-limit`, `@fastify/helmet`, the `authenticate` plugin; accepts an injectable `db` for testing) (depends on T021)
- [X] T025 Implement `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` in `server/src/auth/routes.ts` — login checks `lockout.ts` before password verification, sets/clears the `dashboard_session` cookie (`HttpOnly`, `SameSite=Lax`, `Secure` per `COOKIE_SECURE`, `Path=/`), returns `423` with `retryAfterSeconds` when locked (depends on T013, T015, T017, T022, T024)
- [X] T026 [P] Route test: successful login sets the cookie and returns the user; wrong password increments the failure count and eventually returns `423`; `GET /auth/me` reflects the session; `POST /auth/logout` clears the cookie and invalidates the session in `server/test/auth.test.ts` (uses `buildApp({db: new Database(':memory:')})` + `migrate.ts` + `app.inject()`) (depends on T025)
- [X] T027 Implement `POST /auth/users` (admin-only via `request.user.role`, `409` on duplicate username) in `server/src/auth/routes.ts` (depends on T025)
- [X] T028 [P] Route test: admin can create a user; a non-admin gets `403`; a duplicate username gets `409` in `server/test/auth.test.ts` (depends on T027)
- [X] T029 Implement `server/src/dashboard/repository.ts` (`getConfigForUser`, `upsertConfigForUser` — both always scoped to the authenticated `user_id`, never a client-supplied id) (depends on T011)
- [X] T030 Implement `GET /dashboard` and `PUT /dashboard` in `server/src/dashboard/routes.ts` (404 when no row exists yet; `PUT` validates via `dashboard/schema.ts` then upserts) (depends on T023, T024, T029)
- [X] T031 [P] Route test: `GET /dashboard` 404s for a user with no row, then reflects a prior `PUT`; a second user's session cannot read or overwrite the first user's row in `server/test/dashboard.test.ts` (depends on T030)
- [X] T032 [P] Implement `GET /healthz` (runs `SELECT 1`, returns `503` on DB failure) in `server/src/app.ts` (depends on T024)
- [X] T033 Implement `server/src/index.ts` (bootstrap: run `migrate.ts` + `bootstrapAdmin.ts`, start the expired-session sweep timer (every 6h), `buildApp()`, `listen(PORT)`) (depends on T019, T024, T032)

### Frontend: types, storage facade, remote provider, auth client

- [X] T034 [P] Define `AuthenticatedUser`, `AuthState`, `LoginCredentials` types in `src/types/auth.ts` per [data-model.md](./data-model.md)
- [X] T035 Refactor `src/services/storage/LocalStorageProvider.ts`: `defaultStorageProvider` becomes a stable delegating facade (same object identity) forwarding to an internally swappable `activeProvider`, plus a new exported `setActiveStorageProvider()` (depends on nothing new; must keep all ~10 existing call sites and `tests/unit/storageProvider.test.ts` passing unchanged)
- [X] T036 [P] Unit test the facade: default-constructed calls still hit the original `LocalStorageProvider` behavior; `setActiveStorageProvider()` redirects `get`/`set`/`remove` to the new provider without changing `defaultStorageProvider`'s identity in `tests/unit/storageProvider.test.ts` (depends on T035)
- [X] T037 Implement `src/services/storage/RemoteStorageProvider.ts` (implements `StorageProvider`; in-memory cache seeded from a `GET /dashboard` hydration step; `set()` updates the cache immediately and schedules a debounced `PUT /dashboard`) (depends on T034)
- [X] T038 [P] Unit test `RemoteStorageProvider`'s cache correctness (`get`/`set`/`remove` against the in-memory cache) in `tests/unit/remoteStorageProvider.test.ts` (depends on T037)
- [X] T039 [P] Implement `src/services/auth/AuthClient.ts` (typed fetch wrapper for `login`/`logout`/`me`/`getDashboard`/`putDashboard`, `credentials:'include'`, treats any `401` as "session invalid") (depends on T034)
- [X] T040 [P] Unit test `AuthClient`: success/error mapping for each call, `401` from any endpoint is surfaced uniformly in `tests/unit/authClient.test.ts` (depends on T039)

### Frontend: auth state machine and gate

- [X] T041 Implement `src/state/AuthProvider.tsx` (`'checking' | 'unauthenticated' | 'authenticated'` state machine: calls `AuthClient.me()` on mount; on success, hydrates `RemoteStorageProvider` via `GET /dashboard` — running the migration decision from US4 — then calls `setActiveStorageProvider()` before flipping to `'authenticated'`; on `401` flips to `'unauthenticated'`) (depends on T037, T039, T035)
- [X] T042 [P] Unit test `AuthProvider`'s state transitions (`checking` → `authenticated`/`unauthenticated`, `401` at any later point returns to `unauthenticated`) in `tests/integration/state/authProvider.test.tsx` (depends on T041)
- [X] T043 [P] Implement `LoginScreen` (username/password form built from `GlassPanel`/`GlassCard`/`GlassInput`/`GlassButton`, calls `AuthClient.login`) in `src/components/auth/LoginScreen/` (+ `.css`)
- [X] T044 [P] Implement `AuthGate` (renders a `GlassPanel`-based loading state while `'checking'`, `LoginScreen` while `'unauthenticated'`, `children` while `'authenticated'`) in `src/components/auth/AuthGate/AuthGate.tsx` (depends on T041, T043)
- [X] T045 Update `src/App.tsx` (not `Dashboard.tsx`) to wrap `<Dashboard/>` in `<AuthProvider><AuthGate>...</AuthGate></AuthProvider>` — deliberately one level above `Dashboard.tsx` so the ~11 existing tests that render `<Dashboard/>` directly (e.g. `tests/integration/WidgetGrid.test.tsx`, `dashboardLaunch.test.tsx`) keep working unchanged, exercising `AppShell` without a session; production behavior is identical either way since `main.tsx` always renders `<App/>` (depends on T044)
- [X] T046 [P] Integration test: `AuthGate` (via `<App/>`) shows the loading state during `'checking'`, `LoginScreen` when `'unauthenticated'`, and renders `Dashboard`'s content only once `'authenticated'` — never a flash of dashboard content before hydration — in `tests/integration/App.test.tsx` (depends on T045)

**Checkpoint**: A fresh deployment can bootstrap an admin, log in, see an empty/default dashboard gated correctly, and log out. All five user stories can now proceed.

---

## Phase 3: User Story 1 - Configure once, keep it forever (Priority: P1) 🎯 MVP

**Goal**: A logged-in user's configuration changes persist to the server and are restored exactly after a full browser restart, without excessive save traffic during rapid interactions like dragging.

**Independent Test**: Log in, change several settings, fully quit and relaunch the browser, revisit the dashboard, and confirm every change is present with no login prompt; separately, drag a widget through many positions and confirm only a small, bounded number of save requests fire.

### Tests for User Story 1

- [X] T047 [P] [US1] Unit test (fake timers) `RemoteStorageProvider`'s debounce: many rapid `set()` calls within the trailing window produce exactly one `PUT`, a burst longer than the max-wait still flushes at the max-wait boundary, in `tests/unit/remoteStorageProvider.test.ts`
- [X] T048 [P] [US1] Unit test the `pagehide` flush: a pending debounced write is sent via `fetch(..., {keepalive:true})` when `pagehide` fires before the debounce timer elapses, in `tests/unit/remoteStorageProvider.test.ts`
- [X] T049 [P] [US1] e2e test: login → change theme/shortcuts/widgets/wallpaper → simulate full browser restart (new context reusing storage state) → dashboard restored with no login prompt, in `tests/e2e/authPersistence.spec.ts`

### Implementation for User Story 1

- [X] T050 [US1] Implement the trailing/max-wait debounce timers (~1000ms trailing, 5000ms max-wait) in `RemoteStorageProvider.set()` in `src/services/storage/RemoteStorageProvider.ts` (depends on T047)
- [X] T051 [US1] Implement the `pagehide` listener performing a final `fetch(..., {keepalive:true})` flush of any pending write in `src/services/storage/RemoteStorageProvider.ts` (depends on T048)
- [X] T052 [US1] Verify quickstart Scenarios 1 and 7 manually against a running dev backend

**Checkpoint**: User Story 1 is fully functional and independently testable — configuration survives a full browser restart, and rapid drags do not spam the network.

---

## Phase 4: User Story 2 - Log out and back in (Priority: P1)

**Goal**: An explicit logout ends the session immediately and reliably; an expired/invalidated session is detected and returns the user to the login screen without a redirect loop; a locked-out account gets a clear message.

**Independent Test**: Log in, log out, confirm the login screen appears and reload does not restore the previous session; separately, force a `401` from any endpoint and confirm a clean, single transition back to the login screen.

### Tests for User Story 2

- [X] T053 [P] [US2] Integration test: clicking the logout action calls `AuthClient.logout()`, transitions `AuthProvider` to `'unauthenticated'`, and shows `LoginScreen` in `tests/integration/logout.test.tsx`
- [X] T054 [P] [US2] Integration test: a `401` response from any authenticated call (e.g. a `PUT /dashboard` failing mid-session) transitions `AuthProvider` straight to `'unauthenticated'` exactly once, with no repeated re-fetch/redirect loop, in `tests/integration/state/authProvider.test.tsx`
- [X] T055 [P] [US2] Integration test: `LoginScreen` shows a clear, distinct message for wrong credentials (`401`) versus a locked account (`423`, including a human-readable retry time) in `tests/integration/LoginScreen.test.tsx`
- [X] T056 [P] [US2] e2e test: login → explicit logout → reload → login screen persists (no silent session restore) in `tests/e2e/authPersistence.spec.ts`

### Implementation for User Story 2

- [X] T057 [US2] Add a logout action in `AuthGate.tsx` (a fixed `GlassIconButton`, not inside `SettingsDrawer`/`AppShell` — those are rendered as `children` and stay reachable by the ~11 tests that render `<Dashboard/>` directly without an `AuthProvider`; putting the button inside them would make it throw `useAuthState must be used within an AuthProvider` in every one of those tests) that calls `logout()` from `useAuthState()` (depends on T053)
- [X] T058 [US2] Wire `AuthProvider`/`AuthClient` so any `401` anywhere (not just the initial `me()` check) transitions to `'unauthenticated'` without looping (depends on T054)
- [X] T059 [US2] Add wrong-credentials and locked-account error states to `LoginScreen` (depends on T055)
- [X] T060 [US2] Verify quickstart Scenarios 2 and 6 manually against a running dev backend

**Checkpoint**: User Story 2 is fully functional and independently testable — logout, expiry, and lockout all resolve cleanly to the login screen.

---

## Phase 5: User Story 3 - Independent accounts (Priority: P1)

**Goal**: Two accounts' dashboard configurations are fully isolated from each other, both while both are in concurrent use and after either logs back in later.

**Independent Test**: Seed two user accounts, configure each differently (e.g. opposite themes), and confirm each account's `GET /dashboard` only ever reflects its own `PUT /dashboard` history, never the other's.

### Tests for User Story 3

- [X] T061 [P] [US3] Route test: two distinct sessions (for two seeded users) each `PUT /dashboard` a different configuration, then each `GET /dashboard` returns only its own data — never the other's — in `server/test/dashboard.test.ts`
- [X] T062 [P] [US3] e2e test: two accounts (admin + a second account created via `POST /auth/users`), each configured differently, confirm no cross-contamination across two separate browser contexts in `tests/e2e/multiUserIsolation.spec.ts`

### Implementation for User Story 3

- [X] T063 [US3] Verify (and add a regression assertion if missing) that `dashboard/repository.ts`'s queries are always parameterized on the session's `user_id`, never a client-suppliable value, in `server/src/dashboard/repository.ts` (depends on T029, T061)
- [X] T064 [US3] Verify quickstart Scenario 3 manually against a running dev backend

**Checkpoint**: User Story 3 is fully functional and independently testable — account isolation is proven at the route level and in a real two-browser-context e2e run.

---

## Phase 6: User Story 4 - First-time migration of existing local settings (Priority: P2)

**Goal**: A user with a pre-existing local (`localStorage`) dashboard configuration has it become their account's configuration automatically on first login, without ever overwriting a config the account already has server-side.

**Independent Test**: Pre-seed `localStorage`'s `dashboard.config.v1`, log into an account with no server-side config yet, and confirm the local configuration becomes the account's persisted configuration; separately, confirm an account that already has a server-side config is never overwritten by an unrelated browser's local data.

### Tests for User Story 4

- [X] T065 [P] [US4] Unit test the migration decision function: 404 + local value present → repairs and returns the local config for upload; 404 + no local value → returns `createDefaultDashboardConfig()`; non-404 (existing row) → returns "skip migration" in `tests/unit/dashboardMigration.test.ts`
- [X] T066 [P] [US4] Integration test: `AuthProvider`'s post-login hydration calls the existing `repairDashboardConfig` (not a reimplementation) on the local value before uploading it in `tests/integration/state/authProvider.test.tsx`
- [X] T067 [P] [US4] e2e test: pre-seed `localStorage`, log in for the first time, confirm the dashboard reflects the previously-local settings and a one-time toast appears; reload and confirm no duplicate migration/toast in `tests/e2e/localConfigMigration.spec.ts`

### Implementation for User Story 4

- [X] T068 [US4] Implement the migration decision logic (reusing `repairDashboardConfig` from `src/config/schema.ts` and `createDefaultDashboardConfig` from `src/config/defaults.ts`) in `src/services/auth/AuthClient.ts` or a new `src/services/auth/migrateLocalConfig.ts`, called from `AuthProvider`'s post-login hydration step (depends on T041, T065)
- [X] T069 [US4] After a successful migration `PUT`, rename (not delete) the `dashboard.config.v1` localStorage key to `dashboard.config.v1.migrated.<ISO-timestamp>` (depends on T068)
- [X] T070 [US4] Show a one-time, non-blocking toast confirming the import, using the existing `StatusMessage` component, in `src/state/AuthProvider.tsx` (depends on T068)
- [X] T071 [US4] Verify quickstart Scenario 4 manually against a running dev backend

**Checkpoint**: User Story 4 is fully functional and independently testable — pre-existing local configuration survives the transition to accounts exactly once, with no data loss and no double-migration.

---

## Phase 7: User Story 5 - Administrator manages accounts (Priority: P3)

**Goal**: An administrator account always exists from first deployment (via env vars) and can create further accounts; non-admins cannot.

**Independent Test**: Deploy fresh with `ADMIN_USERNAME`/`ADMIN_PASSWORD` set, confirm that account can log in immediately and can create a second account that can also log in; confirm a non-admin account is refused when attempting the same action.

**Note**: The underlying endpoints (`bootstrapAdmin`, `POST /auth/users`) were already built in Foundational (T019, T027) because User Story 3 needed a second account to test isolation. This story's remaining work is the role-enforcement guarantees and their tests, which is what actually delivers "administrator manages accounts" as a verified capability.

### Tests for User Story 5

- [X] T072 [P] [US5] Route test: a brand-new `:memory:` database + `bootstrapAdmin()` produces exactly one `role='admin'` user matching the configured env vars, and running it again is a no-op, in `server/test/bootstrapAdmin.test.ts` (may already be covered by T020 — extend if not)
- [X] T073 [P] [US5] Route test: an admin session can `POST /auth/users` and the created account can immediately log in; a `role='user'` session attempting the same request gets `403` in `server/test/auth.test.ts` (may already be covered by T028 — extend if not)

### Implementation for User Story 5

- [X] T074 [US5] Close any gaps found by T072/T073 in `server/src/db/bootstrapAdmin.ts` / `server/src/auth/routes.ts`
- [X] T075 [US5] Verify quickstart Scenario 5's account-creation step (admin creates a second account) manually against a running dev backend

**Checkpoint**: User Story 5 is fully functional and independently testable — admin bootstrap and admin-only account creation are both verified.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Docker/deployment artifacts, documentation, and verification that spans multiple stories. Not required for any single user story to be complete, but required before the feature is deployable in the user's homelab.

- [X] T076 [P] Write `server/Dockerfile` (multi-stage build on `node:22-bookworm-slim`, production `npm ci --omit=dev`)
- [X] T077 [P] Write root `Dockerfile` (multi-stage: Node build of the frontend → `nginx:1.27-alpine` runtime)
- [X] T078 [P] Write `docker/nginx.conf` (serves `dist/`, proxies `/api/*` to the backend service)
- [X] T079 Write `docker-compose.yml` (frontend + backend services, `./data:/data` bind mount, healthchecks, env vars) per [plan.md](./plan.md)'s Docker section (depends on T076, T077, T078)
- [X] T080 [P] Add `.dockerignore` and add `data/` to `.gitignore`
- [X] T081 Run quickstart Scenario 5 (Docker data survival: `docker compose down` / `up -d`, then `--force-recreate` without `-v`) end to end against the built images (depends on T079)
- [X] T082 [P] TypeScript strictness audit confirming no new `any` across `server/src/**` and all new `src/services/auth/`, `src/state/AuthProvider.tsx`, `src/components/auth/**`
- [X] T083 [P] Run the full [quickstart.md](./quickstart.md) validation guide end to end (all 7 scenarios) against the Docker Compose deployment
- [X] T084 Update `README.md`: local dev now needs the backend workspace running alongside `npm run dev`, plus a short Docker Compose quickstart
- [X] T085 [P] Write `docs/first-admin.md`: how `ADMIN_USERNAME`/`ADMIN_PASSWORD` bootstrap the first account on a fresh deployment
- [X] T086 [P] Write `docs/environment-variables.md`: full reference for every env var from [plan.md](./plan.md)'s Technical Context
- [X] T087 [P] Write `docs/backup-restore.md`: backing up and restoring `./data/dashboard.sqlite3` (a plain file copy is sufficient; note the WAL files if the DB is copied while running)
- [X] T088 [P] Write `docs/managing-users.md`: creating additional users via `POST /auth/users`, and the documented limitation that password changes require a direct DB edit or re-bootstrapping the admin row

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories (no login, no session, no config hydration, nothing renders past the auth gate without it).
- **User Stories (Phase 3-7)**: All depend on Foundational completion. US1/US2/US3 (all P1) are independently testable and deliverable in any order once Foundational is done; US4 (P2) and US5 (P3) likewise depend only on Foundational, not on US1-US3, though they are sequenced last to match spec.md's priority order.
- **Polish (Phase 8)**: Depends on all five user stories being complete (the Docker/quickstart verification exercises every story's acceptance scenario together).

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Foundational. No dependency on US2-US5.
- **User Story 2 (P1)**: Starts after Foundational. No dependency on US1/US3-US5 — logout and 401-handling are independent of persistence-debounce details.
- **User Story 3 (P1)**: Starts after Foundational. Relies on the `POST /auth/users` route already built in Foundational (T027) to create its second test account, but adds no new production code dependency on US1/US2.
- **User Story 4 (P2)**: Starts after Foundational. Independent of US1-US3/US5; only touches the post-login hydration step.
- **User Story 5 (P3)**: Starts after Foundational. Mostly verification of Foundational work (T019, T027); independent of US1-US4.

### Within Each User Story

- Tests written and failing before implementation.
- Business logic (debounce timers, migration decision function, role checks) before UI/route wiring.
- Story complete and checkpoint-verified before moving to the next priority.

### Parallel Opportunities

- All `[P]` Setup tasks (T004-T006) run in parallel.
- Within Foundational, the backend auth-primitive tasks (T013-T018) run in parallel with each other (different files); the frontend tasks (T034-T044) run in parallel with the backend tasks once T034 (types) lands, since frontend work only needs the *contract*, not the running backend, to build against.
- Once Foundational completes, US1/US2/US4/US5 can be staffed in parallel (each touches a distinct set of files); US3 mostly adds tests against already-built Foundational code, so it can run in parallel with all of them too.
- All `[P]` Polish documentation tasks (T085-T088) run in parallel.

---

## Parallel Example: Foundational Phase

```bash
# Backend auth primitives, all in parallel once T011 (migrate.ts) lands:
Task: "Implement password.ts (argon2id) + test"
Task: "Implement session.ts (create/validate/touch/delete/sweep) + test"
Task: "Implement lockout.ts (10-failure/15-minute lock) + test"

# Frontend auth plumbing, in parallel with the backend once T034 (types) lands:
Task: "Implement RemoteStorageProvider.ts + cache unit test"
Task: "Implement AuthClient.ts + unit test"
Task: "Implement LoginScreen from the existing glass component kit"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks every story, including login itself)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run quickstart Scenarios 1 and 7 independently
5. Demo if ready — a single admin account can log in, configure the dashboard, and have it survive a full browser restart with debounced saves

### Incremental Delivery

1. Setup + Foundational → a working login/logout gate in front of an empty/default dashboard, backed by real per-user persistence.
2. Add User Story 1 → configuration reliably survives a browser restart with debounced writes → **MVP**, demoable.
3. Add User Story 2 → logout, session-expiry, and lockout all resolve cleanly → demoable.
4. Add User Story 3 → account isolation formally verified → demoable, multiuser-safe.
5. Add User Story 4 → existing users' pre-feature local configuration is preserved → demoable, migration-safe.
6. Add User Story 5 → admin account-management guarantees verified → spec-complete.
7. Polish → Docker Compose deployment, documentation, full quickstart pass.

### Parallel Team Strategy

1. Team completes Setup + Foundational together (this phase is unusually large because the entire backend and the frontend auth gate are genuinely shared, blocking infrastructure — not speculative extra work per story).
2. Once Foundational is done:
   - Developer A: User Story 1 (debounce/persistence) + User Story 4 (migration, touches the same hydration step)
   - Developer B: User Story 2 (logout/expiry/lockout UI)
   - Developer C: User Story 3 (isolation tests) + User Story 5 (admin-role tests) — both are largely verification of Foundational code
3. Stories complete and integrate independently; Polish (Docker Compose + docs) picks up once all five land.

---

## Notes

- `[P]` tasks = different files, no dependencies on other incomplete tasks in the same batch.
- `[Story]` label maps a task to its user story for traceability back to spec.md.
- Foundational is unusually large for this feature because login, session validation, and config hydration are genuinely shared, blocking infrastructure that every single story sits on top of — not speculative extra work done early.
- `POST /auth/users` and `bootstrapAdmin` are built in Foundational (needed by US3's isolation testing) even though they narratively belong to US5 (P3) — US5's own phase is therefore mostly verification/hardening of code that had to exist earlier for infrastructure reasons; this is called out explicitly in Phase 7's note so it isn't mistaken for scope creep into a lower-priority story.
- Docker/deployment is deliberately Polish, not a user story: no FR or acceptance scenario in spec.md requires Docker specifically to pass (only that a stop/restart preserves data), so it must not gate any story's own demoability during local development.
- Verify tests fail before implementing.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently.
