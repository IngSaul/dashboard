# Phase 0 Research: Multiuser Authentication & Real Persistence

No `NEEDS CLARIFICATION` markers remain in the Technical Context — the spec's clarification session
(session duration, lockout policy) and the pre-approved architecture decisions resolved every open
question before this phase began. This document records the decisions and the alternatives
rejected, per the standard research.md format, for future readers who weren't part of that
decision process.

## 1. Backend framework

- **Decision**: Fastify 5 + TypeScript.
- **Rationale**: Built-in `.inject()` gives route-handler testing without a running server or an
  extra dependency (`supertest`), keeping the project on Vitest exclusively (constitution
  Principle VII, Testable). Pairing with `zod` + `fastify-type-provider-zod` gives compile-time and
  runtime validation at every route boundary, mirroring how `repairDashboardConfig` already
  validates the client-side data boundary (constitution Principle VI, Strong Typing).
- **Alternatives considered**: Express (mature, but needs `supertest` for the same testing story —
  an avoidable new dependency) — Hono (excellent on edge runtimes, but its Node.js story is less
  mature than Fastify's for this deployment target).

## 2. SQLite driver

- **Decision**: `better-sqlite3`.
- **Rationale**: Synchronous API mirrors the existing `StorageProvider` idiom the frontend already
  uses; mature and widely deployed; avoids `node:sqlite`'s still-experimental status (a homelab
  container that gets rebuilt against a newer Node image later is exactly the wrong place for an
  experimental core API to change underneath it) and `sql.js`'s in-memory-only model (wrong fit for
  a live server needing per-request durability).
- **Alternatives considered**: `node:sqlite` (experimental), `sql.js` (WASM, in-memory, whole-DB
  re-serialization on every write).

## 3. Password hashing

- **Decision**: `argon2id`, `timeCost:3`, `memoryCost:19456` (KiB), `parallelism:1`.
- **Rationale**: OWASP's current top recommendation; better memory-hardness against GPU/ASIC
  attacks than bcrypt, and no 72-byte input truncation quirk.
- **Alternatives considered**: bcrypt (older recommendation, truncation quirk, weaker memory
  hardness).

## 4. Session mechanism

- **Decision**: DB-backed opaque token (`crypto.randomBytes(32)` → base64url), stored hashed
  (`sha256`) in `sessions.token_hash`, delivered via an `HttpOnly`/`SameSite=Lax` cookie. Sliding
  30-day idle expiration capped at a 90-day absolute maximum (per the spec's clarified answer),
  touched at most once per hour per session to avoid a DB write on every request. 15-minute account
  lockout after 10 consecutive failed logins (per the spec's clarified answer).
- **Rationale**: A DB row is the only mechanism that satisfies "invalidate sessions" and "delete
  expired sessions" without a second revocation-list table — a JWT would need exactly that table
  anyway to be revocable, which just reintroduces the DB dependency it was meant to avoid, with
  more moving parts.
- **Alternatives considered**: JWT (not server-invalidatable without a revocation table);
  session-only (non-persistent) cookie (fails the spec's explicit "close and reopen the browser,
  stay logged in" requirement).

## 5. CSRF posture

- **Decision**: No separate CSRF token.
- **Rationale**: Same-origin deployment (nginx proxies `/api/*`, so the browser only ever sees one
  origin) plus `SameSite=Lax` is sufficient defense for a single-tenant homelab app with no
  cross-origin surface. Adding a CSRF token scheme on top would be unrequested complexity for a
  threat model that doesn't apply here.
- **Alternatives considered**: Double-submit CSRF token (rejected as unnecessary complexity given
  the same-origin + `SameSite=Lax` posture).

## 6. Docker topology

- **Decision**: Same-origin reverse-proxy — nginx serves the built SPA and proxies `/api/*` to the
  backend; the backend's port is not published to the host.
- **Rationale**: Keeps the session cookie first-party with plain `SameSite=Lax`, without ever
  needing `SameSite=None; Secure` (which would force HTTPS just to keep a session alive on a LAN —
  the wrong trade for this deployment).
- **Alternatives considered**: Separate-origin/separate-port topology (would force
  `SameSite=None; Secure`, i.e. mandatory TLS, to keep cookies working cross-origin).

## 7. Backend base image

- **Decision**: `node:22-bookworm-slim` (glibc) for the backend; `nginx:1.27-alpine` for the
  frontend (no native modules there, so Alpine's smaller size is a clean win).
- **Rationale**: `better-sqlite3` and `argon2` are native (napi) modules; glibc has the most
  reliable prebuilt-binary support, avoiding a musl/glibc prebuild gap or needing a build toolchain
  baked into the final image.
- **Alternatives considered**: Alpine for the backend too (native-module prebuild risk on musl).

## 8. Frontend storage-provider swap mechanism

- **Decision**: `defaultStorageProvider` (currently a `const LocalStorageProvider` instance)
  becomes a stable delegating facade — same object identity forever — whose three methods forward
  to an internally swappable `activeProvider`, plus a new exported `setActiveStorageProvider()`.
- **Rationale**: `configStore`'s ~10 call sites all rely on `defaultStorageProvider` as a
  default-parameter binding; a `const` binding can't be repointed from outside its module, so this
  is the minimal seam that keeps every call site unchanged while still allowing `AuthProvider` to
  swap in `RemoteStorageProvider` after a successful session/config hydration. This is exactly the
  seam the project's own `specs/002-widget-dashboard/contracts/storage-provider-contract.md`
  anticipates ("only the `StorageProvider` instance passed to `configStore` changes").
- **Alternatives considered**: Passing an explicit `provider` argument through every call site
  (rejected — the contract doc explicitly commits to zero call-site changes, and doing so would
  touch ~10 files across services/state for no behavioral benefit).

## 9. Local-config migration trigger

- **Decision**: Gate migration purely on server state (a 404 from `GET /dashboard`), not on
  inspecting `localStorage` first.
- **Rationale**: Idempotent and safe by construction — it is structurally impossible to double-run
  or to clobber an account's existing config, because migration only ever fires in the one state
  (no server row yet) where there is nothing to conflict with.
- **Alternatives considered**: A one-time "import your local settings?" confirmation dialog
  (rejected — there is no conflict to adjudicate when the server has nothing yet, so a modal would
  be pure friction against the constitution's low-distraction, "Fast" principles).
