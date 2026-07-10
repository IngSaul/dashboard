# Implementation Plan: Glassmorphism Widget Dashboard

**Branch**: `002-widget-dashboard` | **Date**: 2026-07-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-widget-dashboard/spec.md`, visual
direction from [design-reference.md](./design-reference.md)

## Summary

Extend the existing personal browser start page (`001-browser-dashboard`) with a
configurable, three-column widget system — clock, weather, server status, Docker
container status, calendar, notes, and the existing shortcuts — rendered in a
reusable glassmorphism visual material. Widget selection, ordering, per-widget
settings, monitoring-source endpoints, and the visual theme/style variant are all
typed configuration, persisted locally and editable from a Widget Settings
surface, so business logic (what a widget shows) stays fully decoupled from
presentation (how the glass grid renders it). No widget embeds business-domain
logic; external business tools remain plain shortcut links.

The technical approach reuses the existing React + Vite + TypeScript stack and
config-driven/local-persistence pattern from feature 001. The UI is composed as
an `AppShell` (`BackgroundLayer` + `Workspace` with `LeftColumn`/`CenterColumn`/
`RightColumn` + `SettingsDrawer` + `CommandPalette`), built on top of a small
`src/design/` token system (spacing, radius, color, motion, typography, glass,
shadows, z-index) and a reusable `Glass*` component family (`GlassPanel`,
`GlassCard`, `GlassButton`, `GlassIconButton`, `GlassInput`, `GlassDialog`,
`GlassTooltip`, `GlassDropdown`, `GlassBadge`) so every surface in the app —
widgets, settings, command palette, shortcuts — shares one visual material
instead of each component styling itself.

Widgets are not hardcoded into `Workspace`: a `WidgetRegistry` service exposes
`register()`/`unregister()`/`getMetadata()`/`load()`/`lazyLoad()`, and every
widget type — including the built-in clock, weather, server-status,
docker-status, calendar, notes, and shortcuts widgets — ships as a small
**plugin module** under `src/plugins/<name>/plugin.ts` that registers its own
descriptor at startup. Adding a widget in the future means adding one plugin
module, not touching `Workspace`. Disabled widgets are never downloaded
(`lazyLoad()` code-splits each widget's component), which keeps the plugin
model aligned with the Fast principle rather than working against it.

Theme/appearance configuration is split into six independently-editable
preference groups exposed by a `ThemeProvider` — **Theme** (light/dark/system),
**Appearance** (accent color, density), **Wallpaper** (the existing
`BackgroundConfig`), **Glass** (blur/translucency intensity preset), **Animations**
(motion level, reduced-motion), and **Accessibility** (contrast boost, focus
ring style, font scale) — instead of one flat theme object, so each concern can
evolve independently.

Two entry points — the existing search bar and the new `CommandPalette` — share
one `searchEngine` service instead of each implementing their own
matching/filtering: sources (web search, jump-to-shortcut, commands) register
with it once, and both UIs (plus future quick actions) just render its
results. Layout decisions (which breakpoint is active, how columns
collapse, widget order within a column) are centralized in a `layoutEngine`
service that `Workspace` consumes rather than reimplements. Persistence goes
through a small `StorageProvider` abstraction (`LocalStorageProvider` is the
only implementation shipped) so `configStore` — and everything built on it —
never talks to `window.localStorage` directly, leaving room for a future
sync/cloud provider without touching call sites. Cross-cutting notifications
between otherwise-decoupled areas (theme changes, workspace edits, plugin
registration, background changes, search/command execution, settings
navigation) flow through a minimal `eventBus`, so e.g. `CommandPalette` can
tell `SettingsDrawer` to open a section without importing it. Application
state is organized into five ownership-scoped React Context slices —
`ThemeState`, `WorkspaceState`, `PluginState`, `SettingsState`, `SearchState`
— composed once inside `AppShell` (see **Global State Architecture** below);
there is no single monolithic app-state object.

New local services back this: `widgetLayout` (enable/order/persist),
`widgetRegistry` (plugin registration/metadata/lazy loading), `layoutEngine`
(breakpoint/column/order resolution), `searchEngine` (shared search/command
matching), `monitoring` (non-blocking fetch for server/Docker widgets),
`backgroundEngine` (wallpaper source, overlay, blur, gradient), `iconProvider`
(resolves an icon for each shortcut from Lucide, Simple Icons, a custom SVG,
an auto-discovered site favicon, or a generic fallback, in that preference
order), `eventBus` (cross-slice notifications), and the `StorageProvider`
abstraction behind `configStore`.

## Terminology

**"Widget" is kept**, not renamed to `WorkspaceItem`/`Module`/`Panel`/
`DashboardModule`. Reasoning:

- `spec.md` already uses "widget" throughout (FR-001, User Story 1, Key
  Entities) as validated ubiquitous language with the user; renaming it only in
  code would break the spec-to-code traceability `/speckit-analyze` checks for,
  for no user-facing or architectural benefit.
- "Widget" is this exact product category's industry-standard term (Bonjourr,
  Homepage, iOS/Android/macOS start-page widgets) — keeping it costs nothing
  and reads as familiar to any future contributor.
- The "personal workspace platform" framing the review is asking for is
  already carried by two other terms in this architecture, not by Widget
  itself: **Plugin** (the extensibility unit — a module that registers one or
  more Widgets) is what signals "platform, not fixed feature set," and
  **Workspace** (the `AppShell`'s content surface) is what signals "personal
  environment." Renaming Widget itself would only collide with "Plugin
  module" (is a Module the plugin, or the widget?) without adding clarity.

Fixed glossary for the rest of this plan:

| Term | Meaning |
|---|---|
| **Workspace** | The platform-level surface that arranges and hosts Widgets (`AppShell` → `Workspace` → columns). |
| **Widget** | A single renderable unit placed inside the Workspace (clock, weather, notes, shortcuts, ...). |
| **Plugin** | A code module under `src/plugins/` that registers one or more Widgets (+ metadata/settings) with `WidgetRegistry`. Every Widget in this feature ships as exactly one Plugin; a future Plugin could register more than one Widget. |

## Technical Context

**Language/Version**: TypeScript 5.x (existing project baseline)

**Primary Dependencies**: React 19, Vite build tooling; no new CSS library —
glassmorphism is implemented with native CSS (`backdrop-filter`, layered
translucent surfaces) driven by the `src/design/` token set. Two small,
tree-shakeable icon dependencies are added: **Lucide** (system/UI icons —
settings, close, drag handles, widget chrome) and **Simple Icons** (brand
icons for well-known services, imported per-icon/on-demand, never bundled in
full) to support the Icon System; both are static assets with no runtime
network calls, so they don't affect the Fast principle's startup budget. No
state-management or event-bus library is added — global state uses plain React
Context (five small, ownership-scoped providers, not one store) and the event
bus is a ~30-line typed pub/sub module; see **Global State Architecture** and
[research.md §14](./research.md#14-event-bus-vs-a-state-library) for why this
is preferred over Zustand/Redux for a single-user personal app.

**Storage**: Typed configuration modules for widget catalog/defaults, plus
browser-local persistence for widget enable/order state, per-widget settings,
monitoring source endpoints, notes content, the six `ThemeState` preference
groups (theme, appearance, wallpaper, glass, animations, accessibility), and
per-shortcut resolved icon (cached after first successful lookup so icon
resolution is not repeated on every load). Access to storage is no longer
direct: `configStore` is refactored to depend on a `StorageProvider`
interface, defaulting to a `LocalStorageProvider` implementation over
`window.localStorage` — no other implementation ships in this feature (see
`StorageProvider` below). Widget *registration* itself (the `WidgetRegistry`'s
in-memory map of descriptors) is not persisted — it is rebuilt every load from
the installed plugin modules; only each widget's enabled/order/settings state
persists.

**Testing**: Vitest + Testing Library for widget/service unit and integration
tests (existing tooling), Playwright for responsive/e2e checks — same tooling as
feature 001, extended with widget-specific suites

**Target Platform**: Desktop browser first, tablet browser supported, phone best
effort (unchanged from feature 001)

**Project Type**: React browser start page / single-page web app (extension of
the existing `001-browser-dashboard` codebase, not a new app)

**Performance Goals**: Dashboard chrome and default widgets usable in under one
second; widgets with external data (weather, server status, Docker containers)
fetch asynchronously after first paint and never block render of other widgets

**Constraints**: No `any`; all widget/layout/theme/monitoring configuration is
typed and config-driven; glassmorphism styling stays restrained (background is
the only strongly decorative element; glass surfaces stay neutral; color is
reserved for shortcut icons and status meaning); motion limited to functional
transitions and reduced-motion aware; three-column layout must reflow correctly
on tablet; business-domain logic for external systems (bakery ERP, POS, etc.)
is explicitly out of scope and MUST NOT be introduced

**Scale/Scope**: Single personal user, local device persistence, up to 7
first-party widget/plugin types shipped in this feature (clock, weather,
server status, Docker containers, calendar, notes,
shortcuts) across 3 layout columns, one active `ThemeProvider` preference set
(across its 6 groups), one configured monitoring source endpoint. The
`WidgetRegistry`/plugin pattern itself is scoped as extensible architecture,
not as a commitment to ship additional plugins (e.g. GitHub, Portainer,
Grafana, RSS, Stocks) in this feature — see Complexity Tracking.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Component First**: PASS. Plan introduces a `src/design/` token layer plus a
  reusable `Glass*` component family (`GlassPanel`, `GlassCard`, `GlassButton`,
  `GlassIconButton`, `GlassInput`, `GlassDialog`, `GlassTooltip`,
  `GlassDropdown`, `GlassBadge`) so every surface — widgets, `SettingsDrawer`,
  `CommandPalette` — shares one material by construction, not by convention. `AppShell`/`Workspace` compose `LeftColumn`/`CenterColumn`/
  `RightColumn`; each widget type is a self-contained plugin module (component +
  registration descriptor) behind the common `WidgetRegistry` interface, so
  `Workspace` never hardcodes a widget-by-widget switch — it iterates whatever
  is registered, and never computes column/breakpoint logic itself (that's
  `layoutEngine`'s job). `SearchBar` and `CommandPalette` stay separate,
  focused components but share one `searchEngine` behind them, avoiding
  duplicated matching logic. Existing components (ShortcutCard, CategoryNav,
  WeatherSummary) are composed inside the relevant plugin's widget component
  rather than duplicated.
- **Configuration Driven**: PASS. Widget catalog, enabled/order state,
  per-widget settings, monitoring source endpoints, and the six `ThemeState`
  preference groups (theme, appearance, wallpaper, glass, animations,
  accessibility) all live in typed config modules and local persistence,
  reached only through the `StorageProvider` abstraction; no personal service
  data or business logic is hardcoded into widget components. Each plugin's
  `WidgetDescriptor` (metadata + settings schema) is itself typed
  configuration, not code the grid special-cases.
- **Fast**: PASS. Dashboard chrome and default widgets (clock, shortcuts) render
  from local/default state immediately; network-dependent widgets (weather,
  server status, Docker) load asynchronously post-paint and degrade gracefully
  on failure/timeout, so first-paint usability is unaffected by external
  service latency. `WidgetRegistry.lazyLoad()` code-splits every widget's
  component, so a disabled widget's code is never downloaded — the plugin
  model reduces bundle weight as the widget catalog grows rather than
  increasing it. `layoutEngine`, `searchEngine`, and `eventBus` are all
  synchronous, in-memory, dependency-free modules — none adds I/O or a new
  runtime dependency to the startup path.
- **Responsive**: PASS. `layoutEngine` owns breakpoint detection and column
  reflow as one tested unit instead of scattered CSS/JS across components;
  three-column desktop layout reflows to a tablet-appropriate stacked/collapsed
  arrangement with no overlap; validated in quickstart across desktop and
  tablet widths.
- **Clean UI**: PASS with documented resolution (see Complexity Tracking). Glass
  surfaces are a single, neutral, reusable material; the background image is the
  sole decorative element and is user-controlled/mutable; color is reserved for
  shortcut icons and status meaning, not added by the dashboard itself; motion is
  limited to add/remove/reorder transitions and respects reduced-motion.
- **Strong Typing**: PASS. Widget, widget-layout, `WidgetDescriptor`,
  `ThemeState` groups, `ResolvedLayout`, `SearchSource`/`SearchResult`,
  `StorageProvider`, monitoring-source, and note entities all get explicit
  TypeScript types/schemas; no `any` at any new data boundary, including the
  monitoring endpoint response and the event bus's event payload map.
- **Testable**: PASS. Widget data-fetching (`monitoring`, extended `weather`),
  layout persistence (`widgetLayout`), `widgetRegistry` (register/unregister/
  getMetadata/duplicate-registration handling), `layoutEngine` (breakpoint →
  resolved layout, pure function of inputs), `searchEngine` (source
  registration, ranking/merging), `eventBus` (emit/subscribe/unsubscribe),
  `StorageProvider`/`LocalStorageProvider` (get/set/remove contract), notes
  persistence, `backgroundEngine` (source switching, overlay/blur computation),
  and `iconProvider` (provider fallback chain, caching) are all implemented as
  services independent of rendering, with focused unit tests; widget
  composition and settings interactions get integration tests per existing
  conventions.

## Global State Architecture

Five ownership-scoped React Context slices, each with its own Provider + hook,
composed once inside `AppShell`. There is **no** single `AppState` object —
"AppState" is the *composition* `AppShell` performs, not a data structure, to
avoid a God-object that every feature ends up depending on.

| Slice | Provider / hook | Owns | Persisted via |
|---|---|---|---|
| **ThemeState** | `ThemeProvider` / `useThemeState()` | The six `ThemeState` preference groups (theme, appearance, wallpaper, glass, animations, accessibility) and their resolved, ready-to-use values (e.g. resolved CSS variables, resolved wallpaper via `backgroundEngine`). | `configStore` → `StorageProvider` |
| **WorkspaceState** | `WorkspaceProvider` / `useWorkspaceState()` | The persisted `WidgetLayout`, the current `ResolvedLayout` (via `layoutEngine`), and ephemeral per-widget runtime state (`loading`/`ready`/`unavailable`/`not-configured`) — runtime state is never persisted. | `WidgetLayout` via `widgetLayout` service → `StorageProvider`; runtime state is in-memory only |
| **PluginState** | `PluginProvider` / `usePluginState()` | The `WidgetRegistry`'s in-memory registration map and derived metadata list (what's available to enable, per-type `requiresConfig`, etc.). | Not persisted — rebuilt from `src/plugins/` every load |
| **SettingsState** | `SettingsProvider` / `useSettingsState()` | `SettingsDrawer` open/closed and active section — UI navigation state only; it holds no domain data, it only *navigates to* data owned by other slices (e.g. opening the "Wallpaper" section reads/writes `ThemeState`). | Ephemeral (open/section not persisted); the underlying settings it edits persist via their own slice |
| **SearchState** | `SearchProvider` / `useSearchState()` | Current query, active `searchEngine` results, and `CommandPalette` open/closed + selection index. | Ephemeral, never persisted |

**Ownership rules**:

- Persisted data has exactly one owning slice; no component reads
  `configStore`/`StorageProvider` directly — it goes through the owning
  slice's hook.
- Ephemeral/UI-only state (drawer open, palette open, per-widget loading
  status) belongs to the slice whose UI surfaces it and is never persisted.
- A slice never imports another slice's Provider/internals to talk to it —
  cross-slice notifications (e.g. `SearchState`'s `CommandPalette` telling
  `SettingsState` to open a section, or `PluginState` announcing a newly
  enabled widget so `WorkspaceState` recomputes its `ResolvedLayout`) go
  through `eventBus`. This is what keeps five independent slices from
  collapsing back into one tangled object as the app grows.
- `layoutEngine`, `searchEngine`, `widgetRegistry`, `backgroundEngine`,
  `iconProvider`, and `monitoring` remain plain services (no React
  dependency); the Context slices are thin — they call these services and
  expose their results as state, they don't reimplement the logic.

## Project Structure

### Documentation (this feature)

```text
specs/002-widget-dashboard/
├── plan.md                     # This file
├── research.md                 # Phase 0 output
├── data-model.md               # Phase 1 output
├── quickstart.md               # Phase 1 output
├── design-reference.md         # Visual direction input (pre-existing)
├── contracts/
│   ├── ui-contract.md
│   ├── monitoring-api-contract.md
│   ├── icon-provider-contract.md
│   ├── search-engine-contract.md
│   └── storage-provider-contract.md
└── tasks.md                    # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
src/
├── design/                          # NEW — design system tokens (no components)
│   ├── tokens.ts                     # aggregated token export
│   ├── spacing.ts
│   ├── radius.ts
│   ├── colors.ts
│   ├── motion.ts                     # durations/easings, reduced-motion variants
│   ├── glass.ts                      # blur/translucency/border tokens for the glass material
│   ├── breakpoints.ts                # NEW — breakpoint thresholds consumed by layoutEngine
│   ├── shadows.ts                    # NEW — elevation/shadow tokens for glass surfaces that need to lift above others (dialogs, dropdowns, tooltips)
│   ├── zIndex.ts                     # NEW — stacking-order scale (base, drawer, palette, dropdown, tooltip, dialog) so layering is centrally defined, not guessed per component
│   └── typography.ts
├── state/                            # NEW — five ownership-scoped Context slices, no business logic
│   ├── ThemeProvider.tsx               # ThemeState — wraps theme.ts + backgroundEngine
│   ├── WorkspaceProvider.tsx           # WorkspaceState — wraps widgetLayout.ts + layoutEngine
│   ├── PluginProvider.tsx              # PluginState — wraps widgetRegistry.ts
│   ├── SettingsProvider.tsx            # SettingsState — drawer open/section (ephemeral)
│   └── SearchProvider.tsx              # SearchState — wraps searchEngine.ts + palette open/selection
├── components/
│   ├── glass/                        # NEW — shared Glass* primitive family (built on src/design tokens)
│   │   ├── GlassPanel/
│   │   ├── GlassCard/
│   │   ├── GlassButton/
│   │   ├── GlassIconButton/
│   │   ├── GlassInput/
│   │   ├── GlassDialog/
│   │   ├── GlassTooltip/               # NEW — hover/focus hints (e.g. widget icons, truncated labels), uses zIndex.ts "tooltip" layer
│   │   ├── GlassDropdown/              # NEW — select-style menus (e.g. column/category pickers in WidgetSettings), uses zIndex.ts "dropdown" layer
│   │   └── GlassBadge/                 # NEW — small status/count indicators (e.g. widget "not-configured" marker, category counts)
│   ├── shell/                        # NEW — app-level composition
│   │   ├── AppShell/                  # composes the 5 state Providers, then BackgroundLayer + Workspace + SettingsDrawer + CommandPalette
│   │   ├── BackgroundLayer/           # renders current wallpaper/overlay from ThemeState (backgroundEngine)
│   │   ├── Workspace/                 # renders columns from WorkspaceState's ResolvedLayout — no layout math of its own
│   │   │   ├── LeftColumn/
│   │   │   ├── CenterColumn/
│   │   │   └── RightColumn/
│   │   ├── SettingsDrawer/            # slide-in surface hosting existing Settings + new WidgetSettings, reads/writes SettingsState
│   │   └── CommandPalette/            # keyboard-invoked palette over SearchState/searchEngine (search, jump to shortcut, open settings)
│   ├── widgets/                        # presentational widget components only — no registration logic
│   │   ├── ClockWidget/               # NEW
│   │   ├── WeatherWidget/             # NEW (wraps/extends existing WeatherSummary)
│   │   ├── ServerStatusWidget/        # NEW
│   │   ├── DockerStatusWidget/        # NEW
│   │   ├── CalendarWidget/            # NEW — local month view, no external sync
│   │   ├── NotesWidget/               # NEW
│   │   └── ShortcutsWidget/           # NEW — composes existing ShortcutCard/CategoryNav + IconProvider
│   ├── WidgetSettings/                # NEW — enable/disable/reorder + theme/background/icon controls
│   ├── SearchBar/                     # existing, reused as-is (also invoked from CommandPalette)
│   ├── DateTime/                      # existing, superseded on-dashboard by ClockWidget
│   ├── ShortcutCard/                   # existing, extended to render an IconProvider-resolved icon
│   ├── CategoryNav/                   # existing, reused
│   ├── ThemeToggle/                    # existing, becomes a thin control reading/writing ThemeProvider's `theme` group
│   ├── Settings/                       # existing, composed inside SettingsDrawer with WidgetSettings
│   ├── StatusMessage/                  # existing, reused for widget "unavailable" states
│   └── WeatherSummary/                 # existing, reused inside WeatherWidget
├── plugins/                            # NEW — one module per widget type; registers itself with WidgetRegistry
│   ├── index.ts                         # registerBuiltInPlugins() — imports and registers every plugin below
│   ├── clock/plugin.ts
│   ├── weather/plugin.ts
│   ├── server-status/plugin.ts
│   ├── docker-status/plugin.ts
│   ├── calendar/plugin.ts
│   ├── notes/plugin.ts
│   └── shortcuts/plugin.ts
│   # Each plugin.ts: WidgetDescriptor { type, metadata, component: () => import(widget), defaultSettings }
│   # Future plugins (GitHub, Homepage, Portainer, Grafana, RSS, Stocks, ...) would follow this same
│   # one-module pattern; none are implemented in this feature (see Complexity Tracking).
├── config/
│   ├── defaults.ts                     # extended with widget catalog + theme-group + icon-provider defaults
│   ├── schema.ts                       # extended with widget/layout/theme-group/background/icon schemas
│   └── widgets.ts                      # NEW — typed widget catalog defaults consumed by plugin registration
├── features/
│   └── dashboard/                      # Dashboard.tsx now renders <AppShell> instead of fixed sections
├── services/
│   ├── storage/
│   │   ├── StorageProvider.ts          # NEW — get/set/remove interface; no framework/React dependency
│   │   └── LocalStorageProvider.ts     # NEW — only shipped implementation, wraps window.localStorage
│   ├── configStore.ts                  # existing, refactored to depend on a StorageProvider instead of localStorage directly
│   ├── search.ts                       # existing, becomes the "web search" SearchSource registered with searchEngine
│   ├── weather.ts                      # existing, reused by WeatherWidget
│   ├── shortcuts.ts                    # existing, reused by ShortcutsWidget + registered as the "jump to shortcut" SearchSource
│   ├── categories.ts                   # existing, reused by ShortcutsWidget
│   ├── theme.ts                        # existing, becomes the persistence/access layer behind ThemeState's `theme` + `appearance` groups
│   ├── widgetLayout.ts                 # NEW — enable/order persistence + validation/repair
│   ├── widgetRegistry.ts               # NEW — register()/unregister()/getMetadata()/load()/lazyLoad()
│   ├── layoutEngine.ts                 # NEW — breakpoint detection + WidgetLayout -> ResolvedLayout
│   ├── searchEngine.ts                 # NEW — registerSource()/query(); powers SearchBar + CommandPalette + quick actions
│   ├── eventBus.ts                     # NEW — typed emit()/on()/off() pub/sub, no React dependency
│   ├── monitoring.ts                   # NEW — non-blocking fetch for server-status/Docker widgets
│   ├── notes.ts                        # NEW — local notes persistence
│   ├── backgroundEngine.ts             # NEW — backs ThemeState's `wallpaper` group: source resolution, overlay/blur/gradient
│   └── iconProvider.ts                 # NEW — resolves a shortcut icon via Lucide/Simple Icons/custom SVG/favicon/fallback, with caching
├── types/
│   ├── dashboard.ts                    # existing, extended
│   ├── widgets.ts                      # NEW — Widget, WidgetLayout, WidgetDescriptor, WidgetMetadata, MonitoringSourceConfig, Note, ThemePreferences, BackgroundConfig, IconSource
│   ├── layout.ts                       # NEW — Breakpoint, ResolvedLayout
│   ├── search.ts                       # NEW — SearchSource, SearchResult
│   └── events.ts                       # NEW — typed event-name -> payload map consumed by eventBus
└── utils/
    ├── dateTime.ts                      # existing, reused by ClockWidget/CalendarWidget
    ├── keyboard.ts                      # existing, reused by CommandPalette and widget settings nav
    └── validation.ts                    # existing, extended for new schemas

tests/
├── unit/            # widgetLayout, widgetRegistry, layoutEngine, searchEngine, eventBus, StorageProvider/LocalStorageProvider, monitoring, notes, backgroundEngine, iconProvider, schema validation/repair
├── integration/      # AppShell composition (5 state providers), Workspace (via WorkspaceState/layoutEngine), WidgetSettings, CommandPalette+SearchBar (shared searchEngine), per-widget rendering + fallback states
└── e2e/               # three-column responsive layout, reduced-motion, keyboard nav across widgets and CommandPalette
```

**Structure Decision**: Extend the existing React dashboard structure from
feature 001 rather than introducing a new module boundary. A new `src/design/`
layer holds only tokens (no JSX), consumed by a new `components/glass/`
primitive family so every surface in the app shares one material by
construction. `components/shell/` holds the `AppShell` composition
(`BackgroundLayer`, `Workspace` with its three columns, `SettingsDrawer`,
`CommandPalette`) that replaces `Dashboard.tsx`'s previous fixed-section
layout. Widget *presentation* lives under `components/widgets/`; widget
*registration* lives under the new `src/plugins/` directory, one module per
widget type, each registering a `WidgetDescriptor` with the new
`widgetRegistry` service — `Workspace` renders whatever is registered and
enabled, it never imports a specific widget component directly. A new
`src/state/` layer holds only the five Context Providers/hooks (no business
logic of their own — they call into `src/services/`); this is what `AppShell`
composes. New business logic (widget layout persistence, widget registry,
layout resolution, search matching, cross-slice events, storage access,
monitoring fetch, notes persistence, background engine, icon provider) lives
in `src/services/` (with `services/storage/` isolating the one place that
touches `window.localStorage`), keeping it independently testable and
separate from both state and presentation, consistent with the Component
First and Testable principles.

## Complexity Tracking

> Documented resolution, not a constitution violation requiring an exception.

| Tension | Why Needed | How Resolved |
|---------|------------|--------------|
| Reference visual direction (photographic background, colorful icon grid) vs. Clean UI's minimalism | User explicitly requested a glassmorphism aesthetic inspired by Arc/Bonjourr/Homepage as the visual language for this feature | Background image is the single decorative element (user-controlled, defaults to a muted local asset, loaded progressively so it never blocks first paint); every glass surface uses one neutral, reusable material; color appears only via user-chosen shortcut icons and status-meaning (e.g. service up/down), never added decoratively by the dashboard itself. Documented in [design-reference.md](./design-reference.md). |
| Automatic icon discovery (fetching a favicon for a shortcut URL) vs. Fast principle's "no blocking network calls on startup" | User wants shortcuts to automatically get a real icon from the target site instead of requiring manual icon selection every time | Icon resolution runs only once, on demand, when a shortcut is created/edited in `SettingsDrawer` — never during dashboard load. The resolved icon (or fallback) is cached in persisted config via `iconProvider`, so normal dashboard renders read a cached value with zero network calls. See [research.md §6](./research.md#6-icon-system-and-automatic-favicon-discovery). |
| `WidgetRegistry` + plugin-module architecture, named against future plugins (GitHub, Homepage, Portainer, Grafana, RSS, Stocks) not requested in spec.md | User wants adding a future widget to be "literally registering a module," not a change to `Workspace`/grid code | The registry/plugin *mechanism* is built and used by all 7 in-scope widgets now (clock, weather, server-status, docker-status, calendar, notes, shortcuts) so it's exercised, not speculative. No plugin code is written for GitHub/Homepage/Portainer/Grafana/RSS/Stocks in this feature — they're named only as the pattern's validation targets for a later feature. This keeps Configuration Driven scope honest: the registry is real infrastructure paid for by real widgets, not unused abstraction. |
| `layoutEngine` as a dedicated service vs. reflow logic inline in `Workspace`/CSS | Reviewer asked that no component implement layout rules directly, so responsive behavior can evolve (new breakpoints, new layout modes) without touching `Workspace` | `layoutEngine` is exercised immediately by the one layout mode this feature ships (3-column desktop / stacked tablet) — it's not speculative, it's where that logic already had to live; centralizing it just means it lives in one tested module instead of scattered across `Workspace`/`LeftColumn`/`CenterColumn`/`RightColumn` CSS and effects. |
| `searchEngine` unifying `SearchBar` and `CommandPalette` vs. each keeping its own matching logic | Reviewer asked for one engine behind multiple entry points to avoid duplicated search/filter logic as more sources (commands, future quick actions) are added | Both UIs need matching/ranking today (`SearchBar` already existed in feature 001; `CommandPalette` is new in this feature) — sharing one engine avoids writing that logic twice from day one, not pre-building for a hypothetical third UI. |
| `StorageProvider` abstraction vs. `configStore` calling `window.localStorage` directly | Reviewer wants future migration (cloud/remote sync) to not require touching call sites | Exactly one implementation (`LocalStorageProvider`) ships in this feature — no `CloudStorageProvider`/`FilesystemProvider`/`RemoteSyncProvider` code is written. The interface itself is the only new surface, and every existing `configStore` call site already needed *some* storage call, so this is a refactor of existing necessary code, not new functionality. |
| `eventBus` vs. components/slices calling each other directly | Reviewer wants Theme/Workspace/Plugins/Background/Search/Settings decoupled as the app grows past 5–6 areas | Implemented as one small (~30 line) dependency-free module, not a library. Used only where two *different* state slices need to react to each other (e.g. `SearchState`'s palette opening a `SettingsState` section) — direct calls/props are still used within a single slice or a straightforward parent→child relationship; the bus is not used as a substitute for normal React data flow everywhere. |
| Five Context slices instead of one, vs. a single combined store (Zustand/Redux) | Reviewer offered Zustand/Redux/event-bus as options and asked for the best fit | **Chosen**: plain React Context, five slices, no new dependency. **Not chosen**: Zustand/Redux. This is a single-user personal app with naturally small, independently-scoped state trees (theme prefs, layout, registry, drawer UI, search) — a combined store would need the same slice boundaries internally anyway, so it adds a dependency without solving a problem Context doesn't already solve at this scale. Revisit only if a future feature needs cross-cutting derived state or time-travel debugging that Context genuinely can't express cleanly — not before. |

## Phase 0: Research Summary

Research is captured in [research.md](./research.md). Key decisions:

- Glassmorphism is implemented with native CSS `backdrop-filter` plus a
  translucent fill and hairline border, with a solid-color fallback for
  browsers/settings without backdrop-filter support.
- Server-status and Docker-container widgets consume a single user-configured
  HTTP(S) JSON status endpoint (contract in
  [contracts/monitoring-api-contract.md](./contracts/monitoring-api-contract.md));
  the dashboard never talks to a Docker socket directly.
- The calendar widget is a local, read-only month view with no external
  calendar account sync, consistent with the project's no-backend constraint.
- Widget reordering happens through the Widget Settings surface (move
  up/down/toggle), not free-form drag-and-drop on the canvas.
- Background image is bundled as a small set of default options plus a
  user-provided image/URL, persisted like any other preference, loaded without
  blocking first paint; a dedicated `backgroundEngine` service owns wallpaper
  source switching, overlay/blur/gradient computation, and is the extension
  point for future background animation.
- Shortcut icons resolve through an `iconProvider` fallback chain — Lucide
  (generic/system icons) → Simple Icons (known brand match by domain) → a
  user-supplied custom SVG → an auto-discovered site favicon (fetched once, on
  save, and cached) → a generic initials fallback — so every shortcut always
  renders something, never a broken image.
- Widgets register themselves with a `WidgetRegistry` service
  (`register`/`unregister`/`getMetadata`/`load`/`lazyLoad`) from small plugin
  modules under `src/plugins/`, instead of being enumerated by `Workspace`;
  `lazyLoad()` code-splits each widget so disabled ones are never downloaded.
- Theme/appearance configuration is split into six independently persisted
  groups behind one `ThemeProvider` — theme, appearance, wallpaper, glass,
  animations, accessibility — rather than one flat preference object, so each
  concern (e.g. accessibility settings) can be read, tested, and extended on
  its own.
- "Widget" is kept as the domain term (not renamed); "Plugin" and "Workspace"
  already carry the platform framing. See the Terminology section above and
  [research.md §10](./research.md#10-widget-terminology-decision).
- `SearchBar` and `CommandPalette` share one `searchEngine` (source
  registration + query/ranking) instead of duplicating matching logic; `search.ts`
  and `shortcuts.ts` become registered sources rather than being called
  directly by UI components.
- `layoutEngine` centralizes breakpoint detection and column/order resolution;
  `Workspace` consumes its `ResolvedLayout` output instead of computing reflow
  itself.
- `configStore` depends on a `StorageProvider` interface (only
  `LocalStorageProvider` ships) so a future remote/cloud storage backend is a
  new implementation, not a call-site migration.
- Cross-slice communication (Theme/Workspace/Plugins/Background/Search/Settings)
  goes through a minimal `eventBus`, chosen over a state-management library —
  five small React Context slices already cover state ownership at this app's
  scale (see Global State Architecture and
  [research.md §14](./research.md#14-event-bus-vs-a-state-library)).

## Phase 1: Design Summary

Design artifacts:

- [data-model.md](./data-model.md): Widget, WidgetLayout, WidgetDescriptor,
  WidgetMetadata, ThemePreferences (theme/appearance/wallpaper/glass/
  animations/accessibility groups), ResolvedLayout, Breakpoint, SearchSource,
  SearchResult, MonitoringSourceConfig, Note, BackgroundConfig, IconSource —
  fields, validation rules, and fallback/repair behavior.
- [contracts/ui-contract.md](./contracts/ui-contract.md): Behavior contracts for
  the widget grid/registry/lazy-loading, layout engine consumption, widget
  settings, per-widget loading/unavailable states, and shortcut boundary rules.
- [contracts/monitoring-api-contract.md](./contracts/monitoring-api-contract.md):
  Expected JSON shape for the user-configured server-status/Docker-container
  endpoint.
- [contracts/icon-provider-contract.md](./contracts/icon-provider-contract.md):
  Provider fallback order, favicon-discovery request/error behavior, and
  caching rules for shortcut icons.
- [contracts/search-engine-contract.md](./contracts/search-engine-contract.md):
  `SearchSource` registration shape, ranking/merging rules, and how `SearchBar`/
  `CommandPalette`/quick actions consume the shared engine.
- [contracts/storage-provider-contract.md](./contracts/storage-provider-contract.md):
  `StorageProvider` interface guarantees and `LocalStorageProvider` behavior.
- [quickstart.md](./quickstart.md): End-to-end validation guide for widget
  add/remove/reorder, theme switching, monitoring/weather fallback, notes
  persistence, icon auto-discovery, shared search/command behavior, and
  desktop/tablet responsive checks.

## Post-Design Constitution Check

- **Component First**: PASS. Data model and UI contract keep each widget
  self-contained behind a common `WidgetDescriptor` interface registered with
  `WidgetRegistry`; `AppShell`/`Workspace` and the `Glass*` family are the only
  new structural primitives, reused by every widget and by
  `SettingsDrawer`/`CommandPalette`. The five `src/state/` Providers hold no
  business logic themselves — they compose existing/new services — so adding a
  state concern later doesn't mean adding a new kind of component.
- **Configuration Driven**: PASS. Data model defines typed, persisted
  configuration for layout, the six `ThemePreferences` groups, monitoring
  source, notes, and per-shortcut icon; every widget's registration
  (`WidgetDescriptor`) is itself typed config, not a hardcoded case; no widget
  hardcodes personal data. All of it is reached through `StorageProvider`, not
  ad hoc `localStorage` calls scattered across services.
- **Fast**: PASS. UI contract requires default widgets to render from local
  state before any network widget resolves; monitoring/weather contracts
  require async, non-blocking fetch with timeouts and graceful fallback; icon
  resolution and background loading are both explicitly kept off the render
  path (cached/settings-time only, progressive load respectively); disabled
  widgets are never downloaded via `WidgetRegistry.lazyLoad()`.
  `layoutEngine`/`searchEngine`/`eventBus`/`StorageProvider` are synchronous,
  dependency-free additions — no new async I/O or third-party runtime library
  sits on the startup path.
- **Responsive**: PASS. UI contract and quickstart define three-column desktop
  behavior and its tablet reflow with no overlap; `layoutEngine` is the single
  place that decides this, so `Workspace` and its columns stay presentational.
- **Clean UI**: PASS. UI contract restates the single-decorative-element rule
  (background only), requires every glass surface to be built from the shared
  `Glass*`/token system (no per-component visual divergence), and preserves
  the reduced-motion requirement; the `glass` preference group only selects
  among predefined token presets, so user customization can't break visual
  consistency.
- **Strong Typing**: PASS. Data model gives every new entity (including
  `WidgetDescriptor`, `ThemePreferences`, `ResolvedLayout`, `SearchSource`/
  `SearchResult`, `StorageProvider`, `BackgroundConfig`, and `IconSource`)
  explicit fields and validation rules; monitoring and icon-provider contracts
  are typed response shapes, not `any`; the event bus's payload map is a typed
  union, not a stringly-typed/`any` event system.
- **Testable**: PASS. Quickstart scenarios map directly to spec acceptance
  scenarios and are independently verifiable; business logic (layout
  persistence, widget registry, layout resolution, search matching, event bus,
  storage provider, monitoring fetch, notes, background engine, icon provider)
  is isolated in services per the project structure, independent of the
  `src/state/` Providers and all presentation.

## Agent Context Update

No agent-context update script is present in `.specify/scripts/bash/` (consistent
with feature 001); this step is skipped with no generated agent files to update.
