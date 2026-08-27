# Phase 1 Data Model: Multiuser Authentication & Real Persistence

Server-side entities live in SQLite (`server/src/db/migrate.ts` owns the DDL); client-side types
live in `src/types/auth.ts`. The existing `DashboardConfiguration` (`src/types/dashboard.ts`) is
**not** redefined by this feature — it is stored opaquely, unchanged, as the payload of
`DashboardConfigRecord` below.

## User (server-side: `users` table)

Represents an account able to log in.

| Field | Type | Notes |
|---|---|---|
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Internal identifier. |
| `username` | `TEXT UNIQUE COLLATE NOCASE` | Case-insensitive unique login identifier. |
| `password_hash` | `TEXT` | `argon2id` hash — plaintext password is never stored or logged. |
| `role` | `TEXT CHECK (role IN ('admin','user'))` | Determines access to `POST /auth/users`. |
| `failed_login_count` | `INTEGER DEFAULT 0` | Consecutive failed attempts since the last success or lock expiry. |
| `locked_until` | `TEXT NULL` | ISO 8601 timestamp; `NULL` when not locked. Set 15 minutes forward on the 10th consecutive failure (FR-014). |
| `created_at` / `updated_at` | `TEXT` (ISO 8601) | Standard timestamps. |

**Validation rules**:
- `username` uniqueness enforced case-insensitively at the DB level (`COLLATE NOCASE UNIQUE`); a duplicate create attempt is rejected with a clear error (FR-013).
- `failed_login_count` resets to `0` on any successful login.
- A login attempt while `locked_until` is in the future is rejected without checking the password, and does not further increment `failed_login_count` (FR-014).

**State transitions**: created (via admin bootstrap or `POST /auth/users`) → authenticates any number of times → optionally locked (10 consecutive failures) → unlocked automatically after 15 minutes or immediately on next successful login after expiry.

## Session (server-side: `sessions` table)

Represents one authenticated browser's ongoing login (FR-003, FR-004, FR-005).

| Field | Type | Notes |
|---|---|---|
| `id` | `INTEGER PRIMARY KEY AUTOINCREMENT` | Internal identifier. |
| `token_hash` | `TEXT UNIQUE` | `sha256` of the random session token; the raw token is never persisted, only ever held in the client's cookie. |
| `user_id` | `INTEGER` (FK → `users.id`, `ON DELETE CASCADE`) | Owning account. |
| `created_at` | `TEXT` (ISO 8601) | Login time; start of the 90-day absolute cap. |
| `last_seen_at` | `TEXT` (ISO 8601) | Updated at most once per hour on authenticated requests. |
| `expires_at` | `TEXT` (ISO 8601) | `min(last_seen_at + 30d, created_at + 90d)` — recomputed on each touch. |
| `user_agent` / `ip_address` | `TEXT NULL` | Diagnostic metadata only; not used for authorization decisions. |

**Validation rules**:
- A request is authenticated only if its cookie's token hashes to a `token_hash` with `expires_at` in the future; otherwise the request is treated as unauthenticated (401), never as a silent partial-auth state.
- Logout deletes the row outright — invalidation is immediate and unconditional (FR-004).
- A background sweep deletes rows where `expires_at` has already passed, on a timer (not per-request), keeping the table bounded without needing an external cron process.

**State transitions**: created on successful login → touched (idle-extended, capped) on authenticated activity → deleted on explicit logout, expiry sweep, or cascade from user deletion.

## DashboardConfigRecord (server-side: `dashboard_configs` table)

Wraps the existing, unmodified `DashboardConfiguration` per account (FR-006, FR-007).

| Field | Type | Notes |
|---|---|---|
| `user_id` | `INTEGER PRIMARY KEY` (FK → `users.id`, `ON DELETE CASCADE`) | One row per user — the primary key itself enforces "exactly one config per account," not just app convention. |
| `config_json` | `TEXT` | The serialized `DashboardConfiguration` (`src/types/dashboard.ts`), validated structurally (size cap, shape) by `server/src/dashboard/schema.ts` before being stored — **not** a reimplementation of the client's `repairDashboardConfig` repair rules, which remain the single source of truth for what a "valid" config looks like. |
| `schema_version` | `INTEGER` | Mirrors `DashboardConfiguration.version`, letting the server sanity-check without parsing the full JSON body. |
| `updated_at` | `TEXT` (ISO 8601) | Set on every `PUT /dashboard`. |

**Validation rules**:
- `GET /dashboard` for a user with no row returns 404 — this is the exact signal the frontend's migration logic (FR-016) keys off of, not a special "empty config" payload.
- `PUT /dashboard` upserts (insert-or-replace) the single row for `request.user.id` — a user can never write another user's row, enforced by always scoping the query to the authenticated session's `user_id`, never a client-supplied id (FR-007).

**State transitions**: absent (no row) → created on first successful `PUT` (either the migration write or a fresh default) → updated on every subsequent debounced `PUT` → deleted only via cascade if the owning user is removed.

## Client-side types (`src/types/auth.ts`)

Not persisted — describe the shapes `AuthClient`/`AuthProvider` exchange with the backend.

| Type | Shape | Notes |
|---|---|---|
| `AuthenticatedUser` | `{ id: number; username: string; role: 'admin' \| 'user' }` | Returned by `GET /auth/me`; intentionally excludes any password/session material. |
| `AuthState` | Discriminated union: `{status:'checking'}` \| `{status:'unauthenticated'}` \| `{status:'authenticated'; user: AuthenticatedUser}` | Drives `AuthGate`'s render choice (loading / `LoginScreen` / `AppShell`) per FR-008. |
| `LoginCredentials` | `{ username: string; password: string }` | Client-side shape posted to `POST /auth/login`; never persisted anywhere on the client (not even transiently in `localStorage`/`sessionStorage`), per FR-019. |
