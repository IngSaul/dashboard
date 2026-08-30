# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

Personal Browser Dashboard — a React/TypeScript single-page app that replaces
the browser's default new-tab page, backed by a small Fastify + SQLite
service for accounts and per-account persistence. A distraction-free start
page of configurable widgets — clock, shortcut cards grouped by category,
weather, notes, calendar, status monitors — with light/dark theming,
keyboard navigation, accessibility, and a responsive desktop/tablet layout.
No ads, no feeds.

Deployed with Docker Compose behind Traefik (HTTPS only); see
[README.md](README.md) and [docs/](docs/).

Spec-driven via GitHub Spec Kit (`speckit-*` skills). Three features have
landed, each with its own spec/plan/tasks under `specs/`:

- `specs/001-browser-dashboard/` — the original fixed-section dashboard.
  Historical: its search bar and section layout were replaced by 002.
- `specs/002-widget-dashboard/` — the current UI: `AppShell`, the three-column
  `Workspace`, the widget registry and plugins, the glass design system.
- `specs/003-auth-persistence/` — accounts, sessions, and per-account
  server-side configuration.
- `.specify/memory/constitution.md` — binding project principles (see below)

Read the spec of the feature you are touching. Where 001 and 002 disagree
about the UI, **002 wins**; 001 is kept as a record of how the project
started.

## Constitution (binding, see full text in `.specify/memory/constitution.md`)

1. **Component First** — reusable React components, typed props, single responsibility.
2. **Configuration Driven** — shortcuts/categories/preferences live in typed config, never hardcoded into components.
3. **Fast** — usable in under 1 second; no blocking network calls on startup (weather etc. must be non-blocking).
4. **Responsive** — desktop-first, must adapt cleanly to tablet; phone is best-effort.
5. **Clean UI** — minimalist, dense, no ads/feeds/decorative animation; motion restrained and purposeful, reduced-motion aware.
6. **Strong Typing** — `any` is forbidden anywhere; explicit types/schemas at every data boundary.
7. **Testable** — business logic (config parsing, validation, search, weather fallback, persistence) separated from UI and covered by focused tests.

Any deliberate exception must be documented in the plan with rationale and a follow-up path.

## Workflow

This repo uses the Spec Kit flow: `speckit-specify` → `speckit-clarify` →
`speckit-plan` → `speckit-tasks` → `speckit-implement` (with
`speckit-analyze`/`speckit-checklist` as needed). Use the corresponding
`speckit-*` skill for spec/plan/task edits rather than hand-editing those
documents directly, so cross-artifact consistency is preserved.

Tasks in `tasks.md` are grouped by phase (Setup → Foundational → US1 → US2 →
US3 → Polish) and marked `[X]` when complete. Work through them in order;
Foundational blocks all user stories. When completing a task, update its
checkbox in `tasks.md`.

Within a story: write the test first and confirm it fails, then implement
types/config/services before UI, then reusable components before dashboard
composition (per `tasks.md` "Within Each User Story").

## Project structure

```
src/
├── components/
│   ├── auth/       # LoginScreen, AuthGate, SyncStatusIndicator
│   ├── glass/      # design-system primitives (GlassPanel, GlassDialog, ...)
│   ├── shell/      # AppShell, Workspace + columns, SettingsDrawer, CommandPalette
│   ├── widgets/    # Clock, Shortcuts, Weather, Notes, Calendar, status monitors
│   └── ...         # ShortcutCard, CategoryNav, modals, ThemeToggle, ...
├── config/       # typed defaults.ts, schema.ts (validation/repair), widgets.ts
├── design/       # design tokens (colors, spacing, motion, glass, z-index, ...)
├── features/dashboard/  # Dashboard.tsx — renders AppShell
├── plugins/      # widget registrations (one module per widget type)
├── services/     # configStore, search, weather, shortcuts, categories, theme,
│   ├── auth/     #   AuthClient + first-login migration
│   └── storage/  #   StorageProvider, Local/RemoteStorageProvider, configSyncEngine
├── state/        # context providers: Auth, Theme, Plugin, Workspace, Settings, Search
├── types/        # domain types (dashboard, widgets, auth, layout, search, events)
└── utils/        # dateTime, validation (URL allow-lists), keyboard helpers

server/           # Fastify + SQLite backend (npm workspace)
├── src/
│   ├── auth/     # login/logout/session routes, password hashing, lockout
│   ├── dashboard/# per-account config routes, repository, safety validation
│   ├── db/       # connection, versioned migrations, migration CLI
│   └── plugins/  # authenticate preHandler
└── test/         # Vitest route/unit tests

tests/
├── unit/         # business logic
├── integration/  # component interaction (Testing Library)
├── e2e/          # Playwright browser-level checks (see fixtures.ts for isolation)
└── fixtures/     # shared test fixtures
```

## Commands

- `npm run verify` — the full gate for both workspaces: lint, typecheck,
  tests, build. This is what CI runs; prefer it over the individual steps.
- `npm run dev` — start Vite dev server
- `npm run lint` / `lint:fix` — ESLint over frontend, backend and tests
  (flat config, strict TS, no `any`)
- `npm run typecheck:all` — `tsc -b` (app + node + tests) plus the server
- `npm run test:all` — Vitest in both workspaces (`test` / `test:server`
  individually)
- `npm run build:all` — production build of both workspaces
- `npm run test:e2e` / `test:e2e:headed` / `test:e2e:ui` — Playwright
  (not part of `verify`: starts two servers and a browser)

## Conventions

- TypeScript strict, no `any` anywhere (enforced by constitution + lint), in
  **both** workspaces — the backend is linted and typechecked by the same gate.
- Persistence is per account and server-side. `configStore` keeps a
  synchronous API; the write path behind it (debounce, serialisation, retry,
  revision preconditions) lives in `services/storage/configSyncEngine.ts`.
  Browser storage is only the pre-account fallback and a first-login import.
- URLs are checked against an explicit protocol allow-list
  (`utils/validation.ts`), never merely parsed. Icons persist a slug, never
  markup — see `services/brandIconSlugs.ts`.
- Weather and other external data must degrade gracefully and never block first render.
- Keep components presentational where possible; put logic in `services/`/`utils/` so it's independently testable.
- Commit messages in this repo are a mix of English and Spanish; match the style of recent commits (`git log`) rather than forcing one language.

## Agent notes

- Previously driven by Codex; now driven by Claude Code. No Codex-specific
  agent-context files exist to keep in sync (`plan.md` notes no
  agent-context update script is present).
- Do not hand-edit `spec.md`/`plan.md`/`tasks.md` structure outside the
  speckit skills unless just checking off completed tasks.
- `specs/` records what each feature set out to do. It is history, not a
  description of the code as it stands today — check the code before
  trusting it, and prefer this file and `docs/` for current behaviour.

## Git

- Never run git commit.
- Never run git push.
- Never create commits automatically.
- Suggest a Conventional Commit message only after all validations have passed.
- Wait for me to execute all Git commands manually.