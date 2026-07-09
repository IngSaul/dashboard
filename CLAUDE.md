# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

Personal Browser Dashboard — a local-first React/TypeScript single-page app
that replaces the browser's default new-tab page. Distraction-free start page
with search, date/time, weather, configurable shortcut cards grouped by
category, light/dark theme, keyboard navigation, accessibility, and
responsive desktop/tablet layout. No ads, no feeds, no server backend.

Spec-driven via GitHub Spec Kit (`speckit-*` skills). Active feature:
`specs/001-browser-dashboard/` (branch `001-browser-dashboard`, currently
worked on `main`). Source of truth for scope and requirements:

- `specs/001-browser-dashboard/spec.md` — requirements, user stories, success criteria
- `specs/001-browser-dashboard/plan.md` — technical approach, project structure
- `specs/001-browser-dashboard/tasks.md` — ordered, checkbox-tracked task list
- `.specify/memory/constitution.md` — binding project principles (see below)

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
├── components/   # reusable UI (SearchBar, WeatherSummary, DateTime, ShortcutCard, CategoryNav, ThemeToggle, Settings)
├── config/       # typed defaults.ts, schema.ts (validation/repair)
├── features/dashboard/  # composition shell (Dashboard.tsx, Dashboard.css)
├── services/     # configStore, search, weather, shortcuts, categories, theme
├── types/        # dashboard.ts domain types
└── utils/        # dateTime, validation, keyboard helpers

tests/
├── unit/         # business logic
├── integration/  # component interaction (Testing Library)
├── e2e/          # Playwright browser-level checks
└── fixtures/     # shared test fixtures
```

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — `tsc -b && vite build` (typecheck + production build)
- `npm run lint` / `npm run lint:fix` — ESLint (flat config, strict TS, no `any`)
- `npm test` / `npm run test:watch` — Vitest unit/integration tests
- `npm run test:e2e` / `test:e2e:headed` / `test:e2e:ui` — Playwright

## Conventions

- TypeScript strict, no `any` anywhere (enforced by constitution + lint).
- Local persistence only (browser storage) — no backend, no cross-device sync in this feature.
- Weather and other external data must degrade gracefully and never block first render.
- Keep components presentational where possible; put logic in `services/`/`utils/` so it's independently testable.
- Commit messages in this repo are a mix of English and Spanish; match the style of recent commits (`git log`) rather than forcing one language.

## Agent notes

- Previously driven by Codex; now driven by Claude Code. No Codex-specific
  agent-context files exist to keep in sync (`plan.md` notes no
  agent-context update script is present).
- Do not hand-edit `spec.md`/`plan.md`/`tasks.md` structure outside the
  speckit skills unless just checking off completed tasks.
