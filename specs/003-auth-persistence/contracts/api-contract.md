# API Contract: Auth & Dashboard Persistence

Defines the HTTP surface the frontend depends on. The frontend never accesses the database
directly — all access goes through this contract. All request/response bodies are validated
server-side against `zod` schemas in `server/src/{auth,dashboard}/schema.ts`; no field is ever
`any`. All endpoints are served same-origin behind nginx's `/api/*` proxy (see plan.md's Docker
topology), so no CORS configuration is exercised in the default deployment.

## Authentication cookie

Every authenticated endpoint reads the `dashboard_session` cookie (`HttpOnly`, `SameSite=Lax`,
`Secure` when `COOKIE_SECURE=true`, `Path=/`, no `Domain`). Requests without a valid, unexpired
session are rejected with `401 Unauthorized` and a body of `{ "error": "unauthenticated" }` — the
frontend's `AuthClient` treats any `401` from any endpoint as "session invalid," clears local auth
state, and routes to `LoginScreen` (FR-005), without retrying in a loop.

## `POST /auth/login`

- **Auth**: none.
- **Request body**: `{ "username": string, "password": string }`.
- **Success — 200**: Sets `dashboard_session` cookie; body `{ "id": number, "username": string, "role": "admin" | "user" }`.
- **Errors**:
  - `400` — malformed body (missing/empty fields).
  - `401` — wrong username or password. Body never reveals which was wrong.
  - `423 Locked` — account currently locked out (FR-014); body includes `{ "retryAfterSeconds": number }`.
- **Side effects**: increments `failed_login_count` on failure; on the failure that reaches 10, sets `locked_until` 15 minutes out; resets `failed_login_count` to 0 and clears `locked_until` on success; creates a `sessions` row on success.

## `POST /auth/logout`

- **Auth**: session required.
- **Request body**: none.
- **Success — 204**: Deletes the caller's session row; clears the cookie (`Max-Age=0`).
- **Errors**: `401` if no valid session was present (idempotent from the client's perspective — logging out twice is harmless).

## `GET /auth/me`

- **Auth**: session required.
- **Success — 200**: `{ "id": number, "username": string, "role": "admin" | "user" }` — the exact `AuthenticatedUser` shape (see data-model.md).
- **Errors**: `401` if no valid session. This is the single call `AuthProvider` makes at startup to resolve `'checking'` → `'unauthenticated' | 'authenticated'` (FR-008).
- **Side effect**: touches the session's `last_seen_at`/`expires_at` if more than an hour has passed since the last touch (sliding expiration, capped — see data-model.md).

## `GET /dashboard`

- **Auth**: session required.
- **Success — 200**: The caller's `DashboardConfiguration` JSON, exactly as stored — passed through to the client's existing `repairDashboardConfig` before use, the same as a `localStorage` read is today.
- **404**: No config row exists yet for this account. This is the explicit, structural signal the frontend's migration logic (FR-016) uses to decide whether to migrate local data or seed defaults — it is not an error condition from the client's point of view.
- **Errors**: `401` if no valid session.

## `PUT /dashboard`

- **Auth**: session required.
- **Request body**: A complete `DashboardConfiguration` JSON object (structurally validated server-side — size-capped, shape-checked — but not re-validated against every one of the client's field-level repair rules, which remain the client's responsibility per FR-015's "validated on both client and server" split: the client is the source of truth for *correctness* of the config's contents, the server enforces *safety* of what it stores).
- **Success — 200**: `{ "updatedAt": string }`.
- **Errors**:
  - `400` — body fails structural validation (not valid JSON shape, exceeds size cap, wrong `schema_version` type).
  - `401` — no valid session.
- **Behavior**: Upserts the single row for `request.user.id` (never a client-supplied user id — FR-007). This is the endpoint `RemoteStorageProvider`'s debounced `set()` calls; the frontend never issues one call per intermediate UI state (FR-009).

## `POST /auth/users`

- **Auth**: session required, `role = 'admin'` only.
- **Request body**: `{ "username": string, "password": string, "role": "admin" | "user" }`.
- **Success — 201**: `{ "id": number, "username": string, "role": "admin" | "user" }`.
- **Errors**:
  - `400` — malformed body (e.g. empty password).
  - `403` — caller is authenticated but not an admin (FR-012).
  - `409 Conflict` — `username` already exists (FR-013).
- **Explicitly out of scope**: no `GET`/`PATCH`/`DELETE` on this resource in this feature (per spec Assumptions) — user listing/editing/removal is a documented follow-up, not part of this contract.

## `GET /healthz`

- **Auth**: none.
- **Success — 200**: `{ "status": "ok" }` after a trivial `SELECT 1` against the database, so this also proves DB connectivity — this is the Docker healthcheck target (plan.md's Docker section).
- **Failure**: `503` if the database is unreachable.

## Endpoints deliberately not included

Per the spec's Assumptions (documented, not oversights): no `POST /auth/register`
(self-registration is out of scope — FR-012), no password-change/reset endpoint (documented
limitation — recovery is a direct DB edit or re-bootstrapping the admin row), no admin bootstrap
HTTP endpoint (bootstrap is a startup-time script keyed off `ADMIN_USERNAME`/`ADMIN_PASSWORD`, never
reachable over HTTP).
