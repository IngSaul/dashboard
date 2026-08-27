# Implementation Plan: Multiuser Authentication & Real Persistence

**Branch**: `main` | **Date**: 2026-08-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-auth-persistence/spec.md`

## Summary

Replace the dashboard's browser-only persistence (`localStorage`, key `dashboard.config.v1`) with real account-based authentication and server-side, per-user persistence, deployed via Docker Compose in the user's homelab. A new Fastify + TypeScript backend (`server/`) backed by SQLite (`better-sqlite3`) owns users, sessions, and one JSON `dashboard_configs` row per user (the existing `DashboardConfiguration` shape, unchanged). Sessions are DB-backed opaque tokens in an `HttpOnly`/`SameSite=Lax` cookie (sliding 30-day / absolute 90-day expiration, 15-minute lockout after 10 failed logins, per the spec's clarifications). The frontend gains an `AuthProvider`/`AuthGate`/`LoginScreen` composed from the existing glass component kit, and a `RemoteStorageProvider` that implements the existing `StorageProvider` interface — the project's own `storage-provider-contract.md` already documents this exact migration path, so the ~10 existing call sites of `loadDashboardConfig`/`saveDashboardConfig` require zero changes. First login auto-migrates any pre-existing local config to the account, once, without ever overwriting an existing server-side config.

## Technical Context

**Language/Version**: TypeScript 5.x throughout (frontend: existing `~6.0.2`/strict config; backend: own strict Node-targeted `tsconfig.json` in `server/`).

**Primary Dependencies**: Frontend adds `docs/`-level tooling only — no new frontend runtime dependency besides what's listed under Frontend Integration below (React 19/Vite/existing glass components are reused as-is). Backend (new): Fastify 5, `@fastify/cookie`, `@fastify/cors`, `@fastify/rate-limit`, `@fastify/helmet`, `better-sqlite3`, `argon2`, `zod`, `fastify-type-provider-zod`.

**Storage**: SQLite file (`better-sqlite3`), bind-mounted at `./data/dashboard.sqlite3` in Docker. Replaces `localStorage` as the source of truth for `DashboardConfiguration`; `localStorage` is only ever read once, at first-login migration time.

**Testing**: Vitest everywhere (root config for frontend, a separate `server/vitest.config.ts` with `environment:'node'` for backend), Fastify's built-in `.inject()` for route tests (no supertest), Playwright for e2e (existing).

**Target Platform**: Desktop/tablet browser (unchanged), served by an nginx container; backend runs as a Node.js server container. Both deployed via Docker Compose on the user's homelab LAN.

**Project Type**: React start page (frontend, existing) + new lightweight web-service backend (`server/`), same repo, npm workspaces.

**Performance Goals**: Preserve the existing <1s usable-load goal once the session/config check is warm (browser has a valid cookie and the backend responds quickly on a LAN); the one-time session+config check before first render is a documented, deliberate exception (see Constitution Check).

**Constraints**: No `any` anywhere (frontend or backend); dashboard config writes debounced (~1s trailing / 5s max-wait) so a widget drag does not produce one `PUT` per pixel; passwords never stored or logged in plaintext; no auth token ever placed in `localStorage`; same-origin deployment (nginx proxies `/api/*`) so cookies stay first-party without forcing HTTPS on a LAN.

**Scale/Scope**: Homelab scale — a handful of user accounts (single-digit to low tens), single SQLite file, single backend instance. No horizontal scaling, no multi-tenant/sharing concerns.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Component First**: New `LoginScreen` and `AuthGate` components are composed entirely from existing reusable components (`GlassPanel`, `GlassCard`, `GlassInput`, `GlassButton` in `src/components/glass/`) — no new visual primitives introduced. `AppShell` itself is untouched; it is wrapped, not modified.
- **Configuration Driven**: All deployment-specific values (admin bootstrap credentials, cookie security mode, session TTLs, database path, port) are environment variables read once at backend startup — never hardcoded, never committed. The `DashboardConfiguration` shape/schema itself is unchanged and remains owned by `src/config/`.
- **Fast**: PASSES with one documented, deliberate exception (see Complexity Tracking): `AppShell` does not mount until the session check (`GET /auth/me`) and, if authenticated, the initial `GET /dashboard` both resolve. This is necessary because every existing state provider (`WorkspaceProvider`, `ThemeProvider`, etc.) does a synchronous whole-config read-modify-write against `configStore` — mounting `AppShell` before the remote config is cached would let an early user interaction read empty/default state and write it back over the account's real data. On a LAN homelab deployment this adds a low-single-digit-millisecond round trip before first paint, well within the spirit of the <1s goal, and a minimal loading state (built from `GlassPanel`) is shown throughout so there is no flash of an empty dashboard.
- **Responsive**: `LoginScreen` and the loading state follow the same desktop-first/tablet-adapting breakpoints already defined in `src/design/breakpoints.ts` — no new breakpoint logic.
- **Clean UI**: `LoginScreen` is minimal (username/password fields + submit + error text only), matching the dashboard's existing glassmorphism aesthetic with zero decorative additions.
- **Strong Typing**: No `any` anywhere. Backend request/response bodies are `zod` schemas (`server/src/**/schema.ts` files) — the same "explicit schema at every data boundary" discipline `repairDashboardConfig` already applies client-side. `AuthClient`, `AuthProvider`, and `RemoteStorageProvider` are fully typed against `DashboardConfiguration` and a new `AuthenticatedUser`/`Session` type (no reuse of `unknown`/`any` at the fetch boundary — responses are validated, not just cast).
- **Testable**: Session validation, password hashing/verification, migration logic, and the debounce/cache logic in `RemoteStorageProvider` are all pure/isolable functions covered by Vitest unit tests, independent of UI rendering — mirrors how `repairDashboardConfig`/`configStore` are tested today.

## Project Structure

### Documentation (this feature)

```text
specs/003-auth-persistence/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/
│   └── api-contract.md   # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
# Frontend — existing React start page, extended in place
src/
├── components/
│   └── auth/
│       ├── LoginScreen/LoginScreen.tsx (+ .css)
│       └── AuthGate/AuthGate.tsx
├── services/
│   ├── auth/AuthClient.ts
│   └── storage/
│       ├── StorageProvider.ts          # unchanged
│       ├── LocalStorageProvider.ts     # changed: delegating facade + setActiveStorageProvider()
│       └── RemoteStorageProvider.ts    # new
├── state/
│   └── AuthProvider.tsx                # new
├── App.tsx                             # changed: wraps Dashboard in AuthProvider/AuthGate
│                                        #   (one level above Dashboard.tsx, which stays
│                                        #   untouched — see Complexity Tracking's note on
│                                        #   ~11 existing tests that render <Dashboard/> directly)
└── types/
    └── auth.ts                         # new: AuthenticatedUser, session-check result types

tests/
├── unit/  (+ authClient / remoteStorageProvider / authProvider tests)
├── integration/  (+ LoginScreen / AuthGate / migration flow)
└── e2e/  (+ auth session / logout / two-user isolation specs)

# Backend — new npm workspace, independent from the frontend bundle
server/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── Dockerfile
├── src/
│   ├── index.ts                 # bootstrap: buildApp() + listen()
│   ├── app.ts                   # buildApp(deps): FastifyInstance factory (no listen) — used by tests
│   ├── env.ts                   # typed env var parsing (zod), single source of config
│   ├── db/
│   │   ├── connection.ts        # opens better-sqlite3, PRAGMAs (WAL, foreign_keys)
│   │   ├── migrate.ts           # CREATE TABLE IF NOT EXISTS DDL
│   │   └── bootstrapAdmin.ts    # idempotent admin seed from env vars
│   ├── auth/
│   │   ├── password.ts          # argon2id hash/verify
│   │   ├── session.ts           # create/validate/touch/delete/sweep session tokens
│   │   ├── lockout.ts           # failed-attempt counting + 15-minute lock
│   │   ├── schema.ts            # zod request/response schemas
│   │   └── routes.ts            # /auth/login, /auth/logout, /auth/me, /auth/users
│   ├── dashboard/
│   │   ├── schema.ts            # zod structural validation (size cap, shape) — not a
│   │   │                        #   reimplementation of repairDashboardConfig
│   │   ├── repository.ts        # getConfigForUser / upsertConfigForUser
│   │   └── routes.ts            # GET/PUT /dashboard
│   ├── plugins/
│   │   └── authenticate.ts      # preHandler: cookie → session → request.user, else 401
│   └── types.ts                 # User, Session, AuthenticatedUser — no any
└── test/
    ├── auth.test.ts             # buildApp({db:':memory:'}) + migrate + app.inject()
    └── dashboard.test.ts

# Docker / deployment (repository root)
Dockerfile                # frontend: multi-stage Node build → nginx:1.27-alpine
docker/nginx.conf          # serves dist/, proxies /api/* to backend
docker-compose.yml
.dockerignore
```

**Structure Decision**: React dashboard/start page structure (existing `src/`) is kept exactly as-is and only extended (new `auth`-related files, two changed files). A new sibling `server/` directory becomes an npm workspace for the Fastify backend, kept fully independent from the frontend's dependency tree and bundle. The previously empty, unreferenced `client/` directory is deleted as part of this feature's Setup phase, since its continued presence next to a new `server/` would misleadingly suggest a client/server split that isn't what's happening — the frontend remains at `src/`.

## Complexity Tracking

> Constitution Principle III ("Fast" — avoid blocking startup with nonessential network requests) has one deliberate, necessary exception.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|---------------------------------------|
| `AppShell` waits for `GET /auth/me` + `GET /dashboard` to resolve before first render, instead of rendering immediately against cached/default state | Every existing state provider (`WorkspaceProvider`, `ThemeProvider`, `useShortcutLibrary`, etc.) performs a synchronous whole-config read-modify-write via `configStore`. If `AppShell` rendered before the remote config was hydrated, any user interaction firing in that window would read the default/empty config and write it back over the account's real server-side data — a genuine data-loss race, not just a cosmetic flash. | Rendering `AppShell` optimistically against `localStorage`/defaults and reconciling later was rejected: reconciling a full-object config after the user may have already mutated the "wrong" copy has no safe merge strategy given the whole-object read-modify-write pattern baked into ~10 existing call sites, and changing all of them to be reconciliation-aware would be a far larger, riskier change than a single one-time loading gate. The loading gate is minimal (one sequential pair of fast LAN requests) and shown via existing glass components, keeping the perceived-startup impact small. |
