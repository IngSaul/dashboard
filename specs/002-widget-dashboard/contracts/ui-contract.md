# UI Contract: Glassmorphism Widget Dashboard

Behavioral contract for the widget grid, widget settings, and per-widget
states. Extends the UI contract established in
`specs/001-browser-dashboard/contracts/ui-contract.md`; where not restated,
that contract's rules (search, keyboard navigation, accessibility, theming
baseline) still apply.

## AppShell & Command Palette

- `AppShell` MUST be the single top-level composition root, rendering (in
  layering order) `BackgroundLayer`, `Workspace`, `SettingsDrawer`, and
  `CommandPalette` — no dashboard content renders outside this shell.
- `SettingsDrawer` MUST be closed by default and MUST NOT block or delay
  rendering of `Workspace` widgets while closed.
- `CommandPalette` MUST be reachable via a keyboard shortcut from anywhere on
  the dashboard, MUST trap focus while open, and MUST close on `Escape`
  without side effects.
- `CommandPalette` actions are limited to navigation/utility actions already
  available elsewhere in the UI (run a search, jump to/open a shortcut, open
  `SettingsDrawer` to a given section) — it MUST NOT introduce any action or
  business logic that doesn't already exist as a first-class dashboard
  feature.
- `CommandPalette` MUST source its results from `searchEngine` (see
  [search-engine-contract.md](./search-engine-contract.md)) — it MUST NOT
  implement its own separate matching/filtering logic.
- Any interaction that needs to affect a different state slice than the one
  the acting component belongs to (e.g. `CommandPalette`, part of
  `SearchState`, opening a `SettingsDrawer` section, part of `SettingsState`)
  MUST go through `eventBus` rather than importing the other component/slice
  directly.

## Widget Registry

- Every widget type rendered anywhere in the dashboard MUST be registered with
  `widgetRegistry` before `Workspace` mounts (`register()` calls run at app
  bootstrap, driven by `src/plugins/index.ts`) — `Workspace` and
  `WidgetSettings` MUST resolve components only through
  `widgetRegistry.getMetadata()`/`lazyLoad()`, never via a direct
  widget-by-type import or switch statement.
- `lazyLoad(type)` MUST code-split the widget's component so a widget the user
  has not enabled is never downloaded by the browser.
- A persisted `Widget.type` that has no matching registration (e.g. a plugin
  was removed) MUST be treated as unknown and dropped during config repair —
  never a thrown error at render time.
- Registering a `type` that is already registered MUST fail loudly in
  development/tests (a coding error) but MUST NOT be able to crash a
  production load — the first registration for a given `type` wins.

## Layout Engine

- `Workspace` and its column components (`LeftColumn`/`CenterColumn`/
  `RightColumn`) MUST render `layoutEngine`'s `ResolvedLayout` output and MUST
  NOT compute breakpoint detection, column reflow, or widget ordering
  themselves — that logic lives in `layoutEngine` alone (see
  [data-model.md](../data-model.md#breakpoint--resolvedlayout)).
- `layoutEngine` MUST recompute `ResolvedLayout` whenever the persisted
  `WidgetLayout` changes, the viewport crosses a breakpoint, or a plugin's
  registration changes (enabling a widget whose type wasn't previously
  registered) — `Workspace` simply re-renders from the new result.

## Widget Grid

- MUST render three columns (`left`, `center`, `right`) on desktop widths, each
  populated by enabled widgets ordered by their `order` field.
- MUST render default widgets (`clock`, `shortcuts`) from local/default state
  immediately on first paint, before any network-dependent widget resolves.
- MUST reflow to a stacked or reduced-column arrangement on tablet widths with
  no overlapping or clipped widget content, per `layoutEngine`'s resolved
  output for the `"tablet"` breakpoint.
- MUST NOT render an empty gap where a disabled widget would have been —
  remaining widgets in a column collapse to fill the space.
- MUST render correctly (no broken layout) when a column has zero enabled
  widgets.

## Per-Widget Contract (applies to every widget type)

- Each widget MUST manage its own loading/data-fetch lifecycle independent of
  other widgets; one widget's failure or slow response MUST NOT delay or break
  any other widget's render.
- Each widget MUST present exactly one of these states at any time: `loading`,
  `ready` (data shown), `unavailable` (fetch failed/timed out), or, where
  applicable, `not-configured` (e.g. monitoring endpoint not set).
- The `unavailable` and `not-configured` states MUST use the existing
  `StatusMessage` component/pattern for visual consistency and MUST NOT block
  interaction with the rest of the dashboard.
- Every widget surface MUST be wrapped in the shared `GlassPanel` primitive —
  no widget introduces a bespoke background/border/blur treatment.

## Widget Settings Surface

- MUST list every available widget type with an enable/disable control.
- MUST allow reordering of enabled widgets within their column via explicit
  controls (e.g. move up/down), operable by keyboard alone.
- MUST allow assigning a widget to a column (`left`/`center`/`right`) where the
  widget type supports more than one column placement.
- MUST persist every change immediately (or on explicit save, matching the
  existing Settings component's save pattern) such that a reload reflects the
  latest configuration.
- MUST expose all six `ThemeProvider` preference groups (theme, appearance,
  wallpaper, glass, animations, accessibility) as distinct, independently
  editable sections alongside widget management, per FR-004 — not a single
  combined "theme" control.
- MUST expose monitoring-source endpoint configuration for the server-status
  and Docker-container widgets.
- MUST be reachable and fully operable via keyboard, consistent with the
  existing dashboard's accessibility support.

## Icon System

- Every shortcut card MUST render an icon resolved via `iconProvider`
  (contract: [icon-provider-contract.md](./icon-provider-contract.md)) — never
  a hardcoded per-shortcut image path managed outside that service.
- Icon resolution/re-resolution MUST only be triggerable from
  `SettingsDrawer`'s shortcut editor, never automatically during dashboard
  render.
- The shortcuts grid MUST render a visually consistent tile for every
  shortcut regardless of which provider resolved its icon — no layout
  difference between a Lucide icon, a brand icon, a custom SVG, a discovered
  favicon, or the initials fallback.

## Shortcuts Widget Boundary

- MUST render shortcut cards showing only name, icon, and category — no data
  fetched from or about the target business application.
- MUST open the target URL via standard navigation (new tab/window per the
  existing shortcut behavior from feature 001) without intercepting,
  authenticating, or syncing with the destination.
- Category grouping (existing `CategoryNav`) MUST continue to organize
  shortcuts visually within the widget.

## Visual Material (Glassmorphism)

- All glass surfaces (widgets, search bar, pill controls, `SettingsDrawer`,
  `CommandPalette`) MUST be built from the `Glass*` component family
  (`GlassPanel`, `GlassCard`, `GlassButton`, `GlassIconButton`, `GlassInput`,
  `GlassDialog`, `GlassTooltip`, `GlassDropdown`, `GlassBadge`), which in turn
  MUST read all visual values (blur, fill, border, radius, motion, shadow,
  stacking order) from `src/design/` tokens — no component defines its own
  blur/translucency/radius/shadow/z-index values inline.
- Any surface that must render above others (`GlassDialog`, `GlassDropdown`,
  `GlassTooltip`, `CommandPalette`, `SettingsDrawer`) MUST take its stacking
  order from `src/design/zIndex.ts`'s named layers — no component hardcodes a
  raw `z-index` number.
- A new visual value (e.g. a different corner radius) MUST be added as a
  design token and consumed by the relevant `Glass*` component, never
  hardcoded at the call site — this is what keeps every surface visually
  consistent as the widget catalog grows.
- The `ThemeProvider`'s `glass` preference group MUST only select among
  predefined token presets (`intensity`, `borderStrength`) — it MUST NOT
  expose arbitrary blur/opacity values to the user, so personalization can
  never produce an inconsistent glass surface.
- The background image MUST be the only strongly decorative visual element;
  glass surfaces themselves stay neutral/monochrome except where color conveys
  meaning (status, user-chosen icons).
- All motion (widget add/remove, reorder, hover/focus transitions) MUST respect
  `prefers-reduced-motion` / the existing reduced-motion preference and MUST be
  limited to functional transitions — no ambient/looping decorative animation.
- Text rendered over the background/glass MUST maintain accessible contrast
  (enforced via the `dimOverlay` scrim in `BackgroundConfig`).

## Failure & Repair

- Invalid, missing, or outdated persisted widget/theme/monitoring configuration
  MUST be repaired to safe defaults on load (matching the existing
  `configStore` repair pattern), never resulting in a failed render.
