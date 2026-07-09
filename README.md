# Personal Browser Dashboard

A local-first, distraction-free start page that replaces your browser's
default new-tab page: search, current date/time, weather, and configurable
shortcut cards grouped by category — no ads, no feeds, no server backend.
Built with React, TypeScript, and Vite.

See [specs/001-browser-dashboard/spec.md](specs/001-browser-dashboard/spec.md)
for the full feature specification and
[CLAUDE.md](CLAUDE.md) for project conventions and workflow.

## Features

- Global search with a configurable destination
- Live date/time and current weather (non-blocking; degrades gracefully when
  unavailable)
- Shortcut cards grouped into categories: add, edit, remove, and reorder
- Light/dark/system theme, remembered across sessions
- Full keyboard navigation and accessible labels/focus states
- Desktop-first responsive layout with tablet support
- All preferences persist locally in the browser — no account, no sync

## Getting Started

### Prerequisites

- Node.js (see `package.json` engines/devDependencies for the toolchain
  versions this was built against) and npm.

### Install

```bash
npm install
```

### Run in development

```bash
npm run dev
```

Opens the dashboard with hot module reloading at the URL Vite prints
(default `http://localhost:5173`).

### Build for production

```bash
npm run build
```

Type-checks (`tsc -b`) and produces an optimized build in `dist/`. Preview
the production build locally with:

```bash
npm run preview
```

### Lint and format

```bash
npm run lint        # check
npm run lint:fix     # check and auto-fix
```

### Tests

```bash
npm test             # unit + integration tests (Vitest)
npm run test:watch   # watch mode
npm run test:e2e     # end-to-end tests (Playwright)
npm run test:e2e:ui  # Playwright UI mode
```

## Using it as your new-tab page

The dashboard is a static site (`dist/` after `npm run build`), so you can
point your browser's new-tab setting at it once it's built and served
however you prefer (a local static file server, or deployed to any static
host). Browser-specific new-tab override steps vary by browser/extension and
are outside this repo's scope.

## Project Structure

```
src/
├── components/   # reusable UI (SearchBar, WeatherSummary, DateTime, ShortcutCard, CategoryNav, ThemeToggle, Settings, StatusMessage)
├── config/       # typed defaults and validation/repair (defaults.ts, schema.ts)
├── features/dashboard/  # composition shell (Dashboard.tsx, Dashboard.css)
├── services/     # business logic (configStore, search, weather, shortcuts, categories, theme)
├── types/        # shared domain types
└── utils/        # dateTime, validation, keyboard helpers

tests/
├── unit/         # business logic tests (Vitest)
├── integration/  # component interaction tests (Testing Library)
├── e2e/          # browser-level tests (Playwright)
└── fixtures/     # shared test fixtures
```

All configuration — shortcuts, categories, search destination, weather
preference, theme — is typed and persisted to `localStorage`; nothing
personal is hardcoded into components. See
[specs/001-browser-dashboard/data-model.md](specs/001-browser-dashboard/data-model.md)
for the full data model.
