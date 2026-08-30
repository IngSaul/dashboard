# Personal Browser Dashboard

A distraction-free start page that replaces your browser's default new-tab
page: a grid of configurable widgets — clock, shortcut cards grouped by
category, weather, notes and status monitors — with no ads and no feeds.
Built with React, TypeScript and Vite, with a small Fastify + SQLite backend
for real accounts and per-account persistence, deployable via Docker Compose
in a homelab.

See [CLAUDE.md](CLAUDE.md) for project conventions and workflow, and
[specs/](specs/) for the feature specifications (`002-widget-dashboard`
describes the current UI; `001-browser-dashboard` is the earlier layout it
replaced).

## Features

- A three-column workspace of widgets you enable and arrange yourself. Clock
  and shortcuts are on by default; weather, notes, calendar and server/Docker
  status monitors can be switched on from the settings drawer.
- Shortcut cards grouped into categories: add, edit, remove, and drag to
  reorder. Brand icons are resolved automatically from the destination.
- A command palette (`Ctrl`/`Cmd` + `K`) for web search and for jumping to a
  shortcut or a settings section. There is no in-page search box: a web page
  cannot focus or type into the browser's own address bar, so imitating one
  would only be a worse omnibox.
- Light/dark/system theme plus wallpaper, glass, motion and accessibility
  preferences, all remembered per account.
- Weather and status data degrade gracefully and never block first render.
- Full keyboard navigation and accessible labels/focus states.
- Desktop-first responsive layout with tablet support.
- Real accounts (username/password), with a session that survives closing
  and reopening the browser — no need to log in every visit.
- Per-account configuration persisted server-side, with changes retried on
  failure and never silently dropped; if another tab or device saved first,
  you are told rather than overwriting it. A pre-existing browser-only
  configuration is imported into your account on first login.

## Getting Started

### Prerequisites

- Node.js and npm (see `package.json`/`server/package.json` for the
  toolchain versions this was built against).
- For the backend: a C/C++ build toolchain is only needed if npm can't fetch
  prebuilt native binaries for `better-sqlite3`/`argon2` for your platform —
  usually unnecessary.

### Install

```bash
npm install
```

Installs both the frontend and the `server` npm workspace.

### Run in development

Two processes, in separate terminals:

```bash
# Terminal 1 — backend (needs at least these two env vars)
ADMIN_USERNAME=admin ADMIN_PASSWORD=change-me npm run dev --workspace=server

# Terminal 2 — frontend (proxies /api/* to the backend, see vite.config.ts)
npm run dev
```

Opens the dashboard with hot module reloading at the URL Vite prints
(default `http://localhost:5173`). Log in with the `ADMIN_USERNAME`/
`ADMIN_PASSWORD` you set — see [docs/first-admin.md](docs/first-admin.md).

### Build for production

```bash
npm run build:all    # both workspaces
npm run build        # frontend only: type-checks + dist/
npm run build:server # backend only: type-checks + server/dist/
```

Preview the frontend production build locally with `npm run preview` (the
backend must be running separately, and won't be proxied to unless you also
configure a reverse proxy — this is what `docker compose` sets up for you,
see below).

### Checks

Everything runs from the repository root and covers both the frontend and
the `server` workspace.

```bash
npm run verify       # lint + typecheck + tests + build, for both workspaces
```

That is the whole gate, and it is what CI runs. The individual steps, in the
order `verify` runs them:

```bash
npm run lint          # ESLint over frontend, backend and tests
npm run lint:fix      # ...and auto-fix
npm run typecheck:all # tsc for the frontend, tests, and the backend
npm run test:all      # Vitest for both workspaces
npm run build:all     # production build of both workspaces
```

Narrower variants exist where a workspace needs checking on its own:
`lint:server`, `typecheck` / `typecheck:server`, `test` / `test:server`,
`build` / `build:server`.

End-to-end tests are separate — they start both dev servers and drive a real
browser, so they are not part of `verify`:

```bash
npm run test:e2e     # Playwright (starts both dev servers itself)
npm run test:e2e:ui  # Playwright UI mode
npm run test:watch   # frontend tests in watch mode
```

## Running with Docker Compose (recommended for a homelab)

```bash
cp .env.example .env   # then edit ADMIN_USERNAME/ADMIN_PASSWORD
docker compose up -d --build
```

Neither container publishes a host port: an existing Traefik instance on the
external `homelab` network reaches the frontend directly, so the dashboard is
served at `https://$DASHBOARD_HOST` (default `dashboard.avalonnova.com`) and
plain HTTP is permanently redirected to HTTPS.

Compose runs the backend with `NODE_ENV=production`, which **requires**
`COOKIE_SECURE=true` — the backend refuses to start otherwise, so a session
cookie can never travel in clear text. Before the first deploy, check that
`TRAEFIK_CERT_RESOLVER` in your `.env` names a real resolver in your Traefik
static configuration. See:

- [docs/first-admin.md](docs/first-admin.md) — bootstrapping the first account
- [docs/environment-variables.md](docs/environment-variables.md) — full env var reference
- [docs/backup-restore.md](docs/backup-restore.md) — backing up/restoring `./data/dashboard.sqlite3`
- [docs/database-migrations.md](docs/database-migrations.md) — schema versioning, and what to do when an upgrade goes sideways
- [docs/diagnosing-sync.md](docs/diagnosing-sync.md) — when configuration stops saving: what the user sees, what is logged, and where
- [docs/managing-users.md](docs/managing-users.md) — creating additional accounts

`docker compose down` followed by `docker compose up -d` preserves all
accounts, sessions, and dashboard configurations — the database lives in a
bind-mounted `./data` directory, untouched by container recreation.

## Using it as your new-tab page

Once deployed (Docker Compose, or your own reverse proxy in front of the
built frontend + backend), point your browser's new-tab setting at its URL.
Browser-specific new-tab override steps vary by browser/extension and are
outside this repo's scope.

## Project Structure

```
src/
├── components/   # auth/ (login, gate, sync status), glass/ (design system),
│                 #   shell/ (AppShell, Workspace, SettingsDrawer, CommandPalette),
│                 #   widgets/ (clock, shortcuts, weather, notes, calendar, monitors)
├── config/       # typed defaults and validation/repair (defaults.ts, schema.ts)
├── design/       # design tokens (color, spacing, motion, glass, z-index, ...)
├── features/dashboard/  # Dashboard.tsx — renders AppShell
├── plugins/      # widget registrations, one module per widget type
├── services/     # business logic (configStore, search, weather, shortcuts, categories,
│                 #   theme, icons; auth/ AuthClient + first-login migration;
│                 #   storage/ StorageProvider, Local/Remote providers, configSyncEngine)
├── state/        # React context providers (auth, theme, plugins, workspace, settings, search)
├── types/        # shared domain types
└── utils/        # dateTime, validation (URL protocol allow-lists), keyboard helpers

server/           # Fastify + SQLite backend (npm workspace) — auth, sessions, per-user config
├── src/          # app.ts, auth/, dashboard/, db/ (connection, migrations, CLI), plugins/
└── test/         # Vitest route/unit tests

tests/
├── unit/         # business logic tests (Vitest)
├── integration/  # component interaction tests (Testing Library)
├── e2e/          # browser-level tests (Playwright); fixtures.ts isolates each worker
└── fixtures/     # shared test fixtures

docker/           # nginx.conf (reverse proxy for the frontend image)
docs/             # first-admin, environment-variables, backup-restore,
                  #   database-migrations, managing-users
.github/workflows # CI: `npm run verify` plus a separate end-to-end job
```

Shortcuts, categories, search destination, weather preference, theme, widget
layout and every other dashboard preference are typed and validated
(`config/schema.ts`) and persist to the backend per account — nothing
personal is hardcoded into components.

Configuration reaches the server through `services/storage/configSyncEngine.ts`,
which keeps one write in flight at a time, retries failures with backoff, and
uses the stored revision as an `If-Match` precondition so a second tab cannot
silently overwrite the first. Anything it cannot save is surfaced in the UI
rather than dropped.
