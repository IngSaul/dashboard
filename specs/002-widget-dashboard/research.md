# Phase 0 Research: Glassmorphism Widget Dashboard

## 1. Glassmorphism implementation approach

- **Decision**: Implement the glass material with native CSS (`backdrop-filter:
  blur(...)`, a translucent background color, and a low-opacity 1px border) in a
  single shared `GlassPanel` component/CSS class, reused by every widget, the
  search bar, pill buttons, and the settings surface. Provide a solid,
  slightly-elevated fallback background for browsers/OS settings where
  `backdrop-filter` is unsupported or disabled (e.g. `prefers-reduced-transparency`
  equivalent), detected via CSS `@supports`.
- **Rationale**: Matches the constitution's Fast principle (no added CSS/JS
  library, no runtime cost beyond a composited blur) and Component First
  principle (one primitive, reused everywhere, instead of ad hoc styling per
  widget). Native CSS keeps the visual language consistent by construction.
- **Alternatives considered**: A CSS-in-JS/utility library for the glass effect
  — rejected, adds bundle weight and a new dependency for something 3 CSS
  properties already achieve. Per-widget custom glass styling — rejected, breaks
  the "one material" consistency required by the design reference and Clean UI.

## 2. Server status / Docker container data source

- **Decision**: Both widgets read from a single user-configured HTTP(S) JSON
  status endpoint (the "monitoring source"), fetched client-side with a request
  timeout and no retries beyond one silent retry on next scheduled poll. Exact
  response shape is defined in
  [contracts/monitoring-api-contract.md](./contracts/monitoring-api-contract.md).
  The dashboard never attempts a direct Docker socket or SSH connection.
- **Rationale**: A browser application has no capability to reach a Docker
  daemon or host OS directly; a small self-hosted status endpoint (e.g. behind
  something like Glances, a custom exporter, or a lightweight status API the
  user already runs) is the only technically reachable option and matches the
  project's "no backend of its own" constraint — the dashboard consumes an
  existing external service, it doesn't become one.
- **Alternatives considered**: Requiring a browser extension or local agent for
  direct Docker access — rejected as out of scope and a much larger surface
  than a personal start page should own. Hardcoding a specific tool's API (e.g.
  Portainer-only) — rejected in favor of a small generic JSON contract so the
  user can front any tool with a thin adapter, keeping the dashboard
  presentation-only per FR-008.

## 3. Calendar widget scope

- **Decision**: The calendar widget is a local, read-only month view (current
  month, today highlighted, no events) with no external calendar account
  integration in this feature.
- **Rationale**: spec.md does not name a calendar provider or request event
  sync, and the constitution disallows blocking/complex startup dependencies;
  a local month view delivers the "glanceable" value (date orientation) without
  introducing OAuth, a new external dependency, or business logic. Event sync
  can be a follow-up feature if requested later.
- **Alternatives considered**: Integrating a specific calendar provider (Google
  Calendar, CalDAV) — rejected for this feature as unscoped, auth-heavy, and a
  scope expansion beyond what spec.md requested.

## 4. Widget reordering interaction

- **Decision**: Reordering happens inside the Widget Settings surface via
  explicit controls (move up/down or an equivalent ordered list control), not
  free-form drag-and-drop directly on the dashboard canvas.
- **Rationale**: spec.md's Assumptions explicitly scope out "free-form
  drag-and-drop pixel positioning" for this feature; an ordered-list control in
  settings is simpler to implement accessibly (keyboard-operable, screen-reader
  friendly) and satisfies User Story 2's acceptance criteria without new
  pointer-drag infrastructure.
- **Alternatives considered**: Canvas drag-and-drop reordering — rejected for
  this feature per the documented assumption; can be revisited as a future
  enhancement if requested.

## 5. Background handling and the BackgroundEngine service

- **Decision**: Ship a small set of default background options (bundled,
  optimized static assets) plus support for a user-provided image (local
  upload converted to a persisted data reference, or a direct image URL),
  stored as part of `BackgroundConfig`. All background behavior — resolving
  the active source, applying the contrast-preserving dim overlay, computing
  blur/gradient treatment, and (later) any animated transition — is owned by a
  dedicated `backgroundEngine` service, consumed by a `BackgroundLayer`
  component that does no logic of its own. The background loads progressively
  and never blocks first paint of dashboard chrome/widgets.
- **Rationale**: Matches design-reference.md's requirement that the background
  be the dashboard's sole strongly decorative element, while respecting the
  Fast principle (no network fetch required to reach a usable first paint) and
  Configuration Driven principle (background choice is typed, persisted
  preference, not hardcoded). Isolating this behavior in one service (rather
  than spreading source-switching/overlay/blur logic across a component) keeps
  it independently testable and gives future features (animated backgrounds,
  time-of-day wallpapers) a single, obvious extension point per the Testable
  and Component First principles.
- **Alternatives considered**: Always-remote background image (e.g. fetched
  from an external image service) — rejected, introduces a startup network
  dependency and a third-party privacy/availability concern for a personal
  start page. Handling overlay/blur inline in `BackgroundLayer`'s JSX/CSS only
  — rejected, makes the behavior untestable without rendering a component and
  harder to extend later.

## 6. Icon System and automatic favicon discovery

- **Decision**: Introduce an `iconProvider` service with a fixed fallback
  chain, evaluated once per shortcut, on create/edit (never on every dashboard
  load): (1) **Lucide** icon if the user picks a generic/system icon, (2)
  **Simple Icons** brand match if the shortcut's domain matches a known brand,
  (3) a **custom SVG** the user uploads/pastes, (4) an **auto-discovered
  favicon** — fetched by requesting the target URL's `/favicon.ico` and
  `<link rel="icon">` candidates client-side, with a strict timeout — (5) a
  **generic fallback** (initials-on-color-tile) if every prior step fails or
  is blocked (e.g. by CORS). The resolved result (provider used + resolved
  value) is cached in persisted shortcut config so normal page loads never
  re-fetch.
- **Rationale**: Matches the reference design's icon-forward shortcut grid
  while keeping resolution off the startup path (Fast principle) — it's a
  one-time, settings-time operation, not a render-time dependency. A fixed,
  ordered fallback chain guarantees every shortcut always renders an icon
  (never a broken image), satisfying the Clean UI/consistency goal without
  requiring the user to manually source an icon for every shortcut.
- **Alternatives considered**: Always requiring manual icon upload — rejected,
  too much friction for a "highly customizable but fast to use" tool per
  spec.md. A server-side icon-proxy service — rejected, this project has no
  backend of its own and shouldn't grow one just for icon fetching. Bundling
  the full Simple Icons set — rejected as a bundle-size regression; icons are
  imported per-match, on demand, only for domains the user actually adds.
- **Constraint noted**: Favicon auto-discovery is a best-effort client-side
  fetch and may be blocked by the target site's CORS policy; when blocked, the
  system silently falls through to the next provider in the chain rather than
  surfacing an error — documented in
  [contracts/icon-provider-contract.md](./contracts/icon-provider-contract.md).

## 7. WidgetRegistry and the plugin-module pattern

- **Decision**: Introduce a `widgetRegistry` service with a small, fixed API —
  `register(descriptor)`, `unregister(type)`, `getMetadata(type)`, `load(type)`,
  `lazyLoad(type)` — and require every widget, including all 7 first-party
  widgets shipped in this feature, to register itself via a plugin module under
  `src/plugins/<name>/plugin.ts`. `Workspace` and `WidgetSettings` read from
  `widgetRegistry.getMetadata()`/`lazyLoad()` only; neither imports a widget
  component by name.
- **Rationale**: Makes "add a widget" a one-module operation instead of a
  cross-cutting change to the grid/settings code, directly serving the
  Component First and Configuration Driven principles as the widget catalog
  grows. `lazyLoad()` also gives the Fast principle a concrete lever: a
  disabled widget's component code is never fetched, so adding more available
  widget *types* doesn't grow the bundle every visitor downloads.
- **Alternatives considered**: A single switch/if-chain in `Workspace` mapping
  `WidgetType` to component — rejected, this is exactly the pattern the
  registry replaces, and it doesn't scale cleanly past a handful of types. A
  full third-party plugin-loading system (dynamically fetching plugin code at
  runtime from outside the build) — rejected as out of scope; this feature's
  "plugins" are first-party modules compiled into the app, not externally
  loaded code, which avoids an entire class of security/trust concerns a
  personal dashboard has no need to take on.
- **Scope boundary**: Only the 7 widgets already in spec.md are implemented as
  plugins in this feature. GitHub, Homepage, Portainer, Grafana, RSS, and
  Stocks were named as illustrative future plugins; none are built here — see
  Complexity Tracking in [plan.md](./plan.md).

## 8. ThemeProvider decomposition

- **Decision**: Replace a single flat theme object with a `ThemeProvider`
  exposing six independently persisted preference groups: **Theme**
  (light/dark/system mode), **Appearance** (accent color, density),
  **Wallpaper** (the existing `BackgroundConfig`, resolved via
  `backgroundEngine`), **Glass** (a blur/translucency *intensity preset* —
  low/medium/high — selecting among `src/design/glass.ts` token values, not
  freeform CSS), **Animations** (motion level / reduced-motion), and
  **Accessibility** (contrast boost, focus ring style, font scale, extending
  feature 001's existing accessibility support).
- **Rationale**: The single-object model from the initial plan draft couples
  unrelated concerns (e.g. changing font scale would touch the same object as
  changing wallpaper), making both testing and future extension harder. Six
  named groups let each be validated, tested, and persisted independently,
  and match how a user actually thinks about "settings" (distinct sections in
  `SettingsDrawer`). Constraining `Glass` to presets (not arbitrary values)
  preserves the "one material" consistency guarantee from the UI contract —
  personalization happens *within* the design system, not outside it.
- **Alternatives considered**: Keeping one flat `ThemeStylePreference` object
  (the initial draft) — rejected per this decision as it doesn't scale past 2–3
  fields cleanly and mixes independently-changing concerns. Fully freeform
  glass customization (arbitrary blur px, arbitrary opacity) exposed to the
  user — rejected, breaks the Clean UI guarantee that every glass surface
  looks intentionally consistent.

## 9. Extending vs. replacing existing feature-001 pieces

- **Decision**: Reuse `WeatherSummary`, `ShortcutCard`, `CategoryNav`,
  `ThemeToggle`, `Settings`, and `StatusMessage` as building blocks inside the
  new widget components rather than rewriting them; extend `configStore.ts`,
  `theme.ts`, and `schema.ts` rather than introducing parallel persistence
  mechanisms.
- **Rationale**: This feature is an extension of `001-browser-dashboard`, not a
  rebuild; reusing existing, already-tested primitives minimizes regression
  risk and keeps configuration in one typed system, per the Component First and
  Configuration Driven principles.
- **Alternatives considered**: A parallel "widgets v2" component/config system
  — rejected as unnecessary duplication for a single personal-use codebase.

## 10. Widget terminology decision

- **Decision**: Keep "Widget" as the term for a renderable unit placed in the
  Workspace; do not rename to `WorkspaceItem`, `Module`, `Panel`, or
  `DashboardModule`.
- **Rationale**: `spec.md` (already validated with the user) uses "widget"
  throughout as ubiquitous language — FR-001, User Story 1, and Key Entities
  all say "widget." Renaming the internal architecture term would decouple the
  spec's language from the code's language for no benefit, undermining the
  spec-to-code traceability `/speckit-analyze` is meant to check. "Widget" is
  also the term this exact product category already uses everywhere (Bonjourr,
  Homepage, iOS/Android/macOS start-page widgets), so it costs a future
  contributor nothing. The "platform, not a fixed feature set" framing this
  review is after is already expressed by two terms introduced earlier in this
  plan: **Plugin** (the registration/extensibility unit) and **Workspace**
  (the platform-level surface that hosts Widgets) — renaming Widget itself
  would only create ambiguity with "Plugin module" (is a Module the plugin or
  the widget?) without adding clarity.
- **Alternatives considered**: `WorkspaceItem` — rejected, more generic but
  less precise than "Widget," and not used anywhere by the user or spec.
  `Module`/`DashboardModule` — rejected, collides with "Plugin module" and
  reads as infrastructure rather than a user-facing concept. `Panel` —
  rejected, already informally associated with settings/side-panel UI
  (`SettingsDrawer`), would be confusing next to `GlassPanel`.

## 11. Unifying SearchBar and CommandPalette behind a Search Engine

- **Decision**: Introduce `searchEngine` with `registerSource(source)` and
  `query(input)`. A `SearchSource` is `{ id, label, kind: "web" | "shortcut" |
  "command", match(query): SearchResult[] }`, evaluated synchronously (no
  network calls inside `match` — the existing `search.ts` web-search source
  builds a URL, it doesn't fetch). `SearchBar` calls `searchEngine.query()`
  scoped to `"web"` (preserving feature 001's exact existing behavior: type,
  press enter, navigate to a search URL) plus `"shortcut"` sources for
  jump-to-shortcut; `CommandPalette` calls the same `query()` unscoped
  (web + shortcut + command sources), reusing the same ranking/merging and the
  same keyboard-navigation (`utils/keyboard.ts`) behavior.
- **Rationale**: Both UIs need matching/filtering/keyboard-selection logic
  today — building that once, behind one engine, avoids two parallel
  implementations drifting apart as sources grow (e.g. a future "search my
  notes" source only needs to register once to appear in both). This directly
  answers the "avoid duplicated logic" instruction.
- **Alternatives considered**: `CommandPalette` reimplementing its own
  filter/keyboard-nav logic independent of `SearchBar` — rejected, this is the
  exact duplication being asked to avoid. A single merged `SearchBar`+
  `CommandPalette` component — rejected; the UI contract in
  [contracts/ui-contract.md](./contracts/ui-contract.md) treats them as
  distinct entry points (inline bar vs. modal overlay) because they serve
  different interaction moments, even though they share an engine.

## 12. Layout Engine

- **Decision**: Introduce `layoutEngine` with a pure function shape:
  `resolveLayout(widgetLayout: WidgetLayout, breakpoint: Breakpoint,
  registry: WidgetMetadata[]): ResolvedLayout`. `Breakpoint` is derived from a
  `useBreakpoint()` hook backed by a `matchMedia` listener against thresholds
  defined in `src/design/breakpoints.ts`. `Workspace`'s three column
  components map over `ResolvedLayout`'s per-column widget lists; they contain
  no breakpoint or reflow logic themselves.
- **Rationale**: The initial plan draft left "three columns reflow to tablet"
  as an implicit responsibility split across `Workspace`/CSS. Reviewer
  correctly flagged that no single piece owned this decision. Centralizing it
  as a pure function of `(layout, breakpoint, registry)` makes tablet reflow
  behavior unit-testable without rendering anything, and gives future layout
  modes (e.g. a single-column "focus mode") one place to be added.
- **Alternatives considered**: CSS-only reflow (grid/flexbox breakpoints with
  no JS layout decision) — rejected because *which widgets go where* (not just
  *how columns look*) needs to change at narrower widths (e.g. right-column
  widgets folding into center), which CSS alone can't express against
  arbitrary per-widget `allowedColumns` metadata.

## 13. StorageProvider abstraction

- **Decision**: Introduce `StorageProvider` — `{ get<T>(key): T | undefined;
  set<T>(key, value): void; remove(key): void }`, synchronous, matching how
  `configStore` already uses `localStorage` today. `LocalStorageProvider` is
  the only implementation, wrapping `window.localStorage` directly.
  `configStore` takes a `StorageProvider` (defaulting to a
  `LocalStorageProvider` singleton) instead of calling `localStorage` inline.
- **Rationale**: Keeping the interface synchronous (rather than `Promise`-based)
  preserves the Fast principle trivially — first paint still reads local state
  with zero awaited I/O — and requires zero changes to existing `configStore`
  call sites beyond the constructor. A future remote/cloud provider would be
  responsible for keeping a synchronous local cache and reconciling
  asynchronously in the background; that's a problem for the feature that
  introduces such a provider, not this one. This satisfies "only introduce the
  abstraction so future migration does not require architectural changes"
  without solving remote sync now.
- **Alternatives considered**: An async-first (`Promise`-returning) interface
  from day one — rejected for this feature; it would ripple `await` through
  every config read, including ones needed before first paint, in exchange for
  a capability (remote storage) nothing in this feature uses. Can be
  revisited when a real async provider is actually built.

## 14. Event bus vs. a state library

- **Decision**: Implement `eventBus` as a small, dependency-free, typed
  pub/sub module (`emit(event, payload)`, `on(event, handler)`,
  `off(event, handler)`), not a library. It is used only for cross-slice
  notifications (see Global State Architecture in
  [plan.md](./plan.md#global-state-architecture)) — e.g. `PluginState`
  announcing a widget was enabled so `WorkspaceState` recomputes its
  `ResolvedLayout`, or `SearchState`'s `CommandPalette` telling `SettingsState`
  to open a section.
- **Rationale**: The user offered three shapes for this (event bus/pub-sub,
  Zustand event slices, "another lightweight architecture") and asked for
  whichever best fits React and the existing stack. This codebase has zero
  state-management dependencies today (feature 001 used plain
  React state/props); adding Zustand *only* for cross-slice events, while
  still using plain Context for the actual state (§15), would mean two
  different mental models for "shared app data" instead of one. A ~30-line
  typed pub/sub module has no dependency cost, is trivially unit-testable
  (`emit` then assert the handler ran), and solves exactly the coupling
  problem named (Theme/Workspace/Plugins/Background/Search/Settings talking to
  each other) without introducing a second state paradigm.
- **Alternatives considered**: Zustand (or Redux) as a combined
  state+event mechanism — considered seriously since it would unify §14 and
  §15 into one library; not chosen because it's a new dependency for a
  single-user app whose actual state trees are small and already naturally
  scoped (see §15), so the library would mostly be replicating boundaries
  Context already expresses. If a future feature needs derived/cross-cutting
  state that Context genuinely struggles with, this decision should be
  revisited — it is not a permanent rejection, just not justified by this
  feature's scope.

## 15. Global state architecture: slice boundaries

- **Decision**: Five React Context slices — `ThemeState`, `WorkspaceState`,
  `PluginState`, `SettingsState`, `SearchState` — each with one Provider and
  one hook, composed once inside `AppShell`. No combined `AppState` object;
  "AppState" is documentation for the composition `AppShell` performs, not a
  data structure any code imports. Full field-level ownership is in
  [plan.md's Global State Architecture section](./plan.md#global-state-architecture).
- **Rationale**: The initial plan draft didn't say who owns what once
  `ThemeProvider`, `WidgetRegistry`, `WidgetLayout`, and the new `SettingsDrawer`/
  `CommandPalette` UI state all exist simultaneously — reviewer correctly
  flagged this ambiguity. Splitting along existing service boundaries (theme,
  workspace/layout, plugin registry, settings navigation, search) rather than
  by "screen" keeps each slice's persistence story simple (one slice per
  `StorageProvider`-backed concern, plus two purely-ephemeral UI slices) and
  avoids any slice becoming a catch-all.
- **Alternatives considered**: One combined `AppState` Context — rejected,
  every consumer would re-render on unrelated changes (e.g. a search
  keystroke re-rendering widgets) unless carefully memoized, and it re-creates
  exactly the God-object problem the review is trying to avoid. Per-component
  local state with prop drilling — rejected, `ThemeState`/`PluginState` in
  particular are needed at many unrelated depths (every `Glass*` consumer,
  every widget, `SettingsDrawer`, `CommandPalette`), which is the textbook case
  Context exists for.

All Technical Context items are resolved; no `NEEDS CLARIFICATION` markers
remain.
