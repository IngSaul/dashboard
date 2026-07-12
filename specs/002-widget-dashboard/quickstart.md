# Quickstart: Glassmorphism Widget Dashboard

Validation guide for the widget dashboard feature. Assumes the existing
`001-browser-dashboard` app already runs locally (`npm run dev`) — this feature
extends it in place.

## Prerequisites

- `npm install` completed.
- Dev server running: `npm run dev`.
- (Optional, for monitoring widgets) A test JSON endpoint reachable from the
  browser matching [contracts/monitoring-api-contract.md](./contracts/monitoring-api-contract.md)
  — a static JSON file served locally is sufficient for validation.

## Scenario 1 — Default load is fast and glanceable (US1)

1. Open the dashboard with no prior local configuration (fresh browser profile
   or cleared site storage).
2. **Expect**: clock and shortcuts widgets render immediately; any other
   default-enabled widgets show a `loading` state briefly, then `ready` or
   `unavailable` — never a blank gap.
3. Disable network access (e.g. dev tools offline mode) and reload.
4. **Expect**: weather/server-status/Docker widgets show `unavailable`; clock,
   shortcuts, notes, and calendar remain fully functional.

## Scenario 2 — Customize widgets and theme (US2)

1. Open Widget Settings.
2. Disable the calendar widget; enable/confirm the notes widget; move one
   widget up within its column.
3. Reload the page.
4. **Expect**: dashboard reflects the new enabled set and order; no layout
   artifacts from the removed widget.
5. Switch the background/theme style option in settings.
6. **Expect**: all widgets and chrome (pills, settings toggle) update to the
   new look consistently; text remains readable against the background.
7. Manually corrupt the persisted widget-layout value in local storage, then
   reload.
8. **Expect**: dashboard falls back to the default layout instead of failing
   to render.

## Scenario 3 — External shortcuts stay presentation-only (US3)

1. In Widget Settings/Shortcuts management, add a shortcut named e.g. "Bakery
   ERP" pointing at any external URL, category "Business".
2. **Expect**: it renders in the shortcuts widget grouped under "Business",
   showing only name/icon/category.
3. Activate the shortcut.
4. **Expect**: it opens the target URL in a new tab/window; no dashboard
   network request is made to fetch data about/from that system, and no
   loading/auth state appears on the dashboard itself.

## Scenario 4 — Monitoring endpoint configuration

1. In Widget Settings, leave the monitoring endpoint unset.
2. **Expect**: server-status and Docker-container widgets show a
   `not-configured` state linking back to settings.
3. Set the endpoint to a local test JSON file matching the contract.
4. **Expect**: widgets transition to `ready` within one poll interval, showing
   host/container data.
5. Point the endpoint at an unreachable URL.
6. **Expect**: widgets transition to `unavailable` after `timeoutMs`, without
   blocking any other widget.

## Scenario 4b — Shortcut icon auto-discovery

1. In `SettingsDrawer`, add a shortcut pointing at a well-known site (e.g. a
   URL whose domain matches a Simple Icons brand) with no manual icon chosen.
2. **Expect**: the shortcut renders the matching brand icon without any
   further action.
3. Add a shortcut pointing at an arbitrary/self-hosted URL with a discoverable
   favicon.
4. **Expect**: the shortcut renders that site's favicon after saving.
5. Add a shortcut pointing at a URL that blocks cross-origin favicon access.
6. **Expect**: the shortcut renders the generic initials fallback tile, with
   no error shown and no blocked/stuck editor state.
7. Reload the dashboard after adding the above shortcuts.
8. **Expect**: icons render immediately from cache — no network request is
   made for previously-resolved shortcut icons on normal page load.

## Scenario 4c — Widget registry lazy loading

1. With the Docker-container widget disabled, load the dashboard and inspect
   network requests (dev tools).
2. **Expect**: no JS chunk for `DockerStatusWidget` is downloaded.
3. Enable the Docker-container widget from `SettingsDrawer`.
4. **Expect**: its chunk downloads at that point (or on next load) and the
   widget renders normally afterward.

## Scenario 5 — Responsive layout

1. View the dashboard at a desktop width (e.g. ≥1280px).
2. **Expect**: three columns visible side by side, no overlap.
3. Resize/emulate a tablet width (e.g. ~768–1024px).
4. **Expect**: columns reflow (stack or collapse) with all widgets fully
   visible and interactive, no clipped or overlapping content — driven by
   `layoutEngine`'s resolved output, not per-component CSS breakpoints.

## Scenario 6 — CommandPalette / search engine

> **2026-07-12 update**: this scenario previously also compared results
> against `SearchBar`, which was removed — see spec.md's Clarifications
> entry. No browser API lets a page or extension focus/write the native
> address bar or read the default search engine, so an in-page search box
> could only mimic the browser's omnibox, never proxy it.

1. Open `CommandPalette` (keyboard shortcut) and type a shortcut's name.
2. **Expect**: a matching jump-to-shortcut result appears, sourced from
   `searchEngine`.
3. From `CommandPalette`, select a command that opens a specific
   `SettingsDrawer` section (e.g. "Open Wallpaper Settings").
4. **Expect**: the drawer opens directly to that section; inspect that this
   happened via an `eventBus` event rather than `CommandPalette` importing
   `SettingsDrawer`'s internals (code-review check, not a runtime one).

## Scenario 7 — Storage provider degrades gracefully

1. Simulate `localStorage` being unavailable (e.g. disable storage in dev
   tools / private mode with storage blocked).
2. **Expect**: the dashboard still loads and is fully interactive for the
   session (via `LocalStorageProvider`'s in-memory fallback), though
   preferences won't survive a reload — no crash, no blank page.

## Automated checks (mapped to contracts)

- `tests/unit/widgetLayout.test.ts` — layout persistence, validation/repair.
- `tests/unit/widgetRegistry.test.ts` — register/unregister/getMetadata,
  duplicate-registration handling, unknown-type lookups.
- `tests/unit/monitoring.test.ts` — endpoint fetch, timeout, malformed-response
  handling per `monitoring-api-contract.md`.
- `tests/unit/notes.test.ts` — notes persistence, size bounding.
- `tests/unit/backgroundEngine.test.ts` — source resolution, overlay/blur/
  gradient computation, fallback to default on invalid config.
- `tests/unit/iconProvider.test.ts` — fallback chain order, caching,
  CORS/timeout fallthrough per `icon-provider-contract.md`.
- `tests/unit/layoutEngine.test.ts` — `resolveLayout()` across breakpoints,
  pure-function behavior given fixed inputs.
- `tests/unit/searchEngine.test.ts` — source registration, ranking/merging,
  per-source failure isolation, duplicate-id handling.
- `tests/unit/eventBus.test.ts` — emit/on/off, multiple subscribers, no
  cross-event leakage.
- `tests/unit/storageProvider.test.ts` — `LocalStorageProvider` get/set/remove,
  in-memory fallback when `localStorage` is unavailable.
- `tests/integration/WidgetGrid.test.tsx` — enable/disable/reorder reflected in
  render (via `WorkspaceState`/`layoutEngine`); empty-column handling.
- `tests/integration/WidgetSettings.test.tsx` — keyboard operability, all six
  theme-group sections, and monitoring-endpoint controls.
- `tests/integration/CommandPalette.test.tsx` — `CommandPalette` shortcut
  matches, command results, and command execution reaching `SettingsDrawer`
  via `eventBus`. (Formerly `SearchAndCommandPalette.test.tsx`, which also
  covered `SearchBar`; `SearchBar` was removed 2026-07-12 — see spec.md's
  Clarifications entry.)
- `tests/e2e/responsive-widgets.spec.ts` — desktop/tablet reflow, reduced-motion
  behavior.
