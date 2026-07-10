# Phase 1 Data Model: Glassmorphism Widget Dashboard

All entities are TypeScript types/schemas under `src/types/widgets.ts` (domain
types) and `src/config/schema.ts` (validation/repair), following the existing
pattern from feature 001. No field uses `any`.

## Widget

Represents one widget instance placed on the dashboard.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Stable identifier for the instance (supports multiple instances of the same type in future; single instance per type for this feature). |
| `type` | `WidgetType` (union: `"clock" \| "weather" \| "server-status" \| "docker-status" \| "calendar" \| "notes" \| "shortcuts"`) | Must match a `type` registered with `widgetRegistry` at load time; the registry (not this field) determines which component actually renders. |
| `enabled` | `boolean` | Whether the widget is currently shown. |
| `column` | `"left" \| "center" \| "right"` | Which of the three layout columns the widget belongs to. |
| `order` | `number` | Position within its column; lower renders first. |
| `settings` | `WidgetSettings` (discriminated union keyed by `type`) | Per-widget-type configuration, e.g. `NotesWidgetSettings`, `MonitoringWidgetSettings`. |

**Validation rules**:
- `column`/`order` combination must be unique per enabled widget (repair: append to end of column on conflict).
- `type` must be a known `WidgetType`; unknown types are dropped during config repair (forward-compat safety).
- Widgets of type `shortcuts` and `clock` are enabled by default and cannot both be disabled at once (dashboard must never render fully empty — falls back to defaults per FR-011).

## WidgetLayout

The persisted collection of `Widget` instances plus layout-level metadata.

| Field | Type | Notes |
|---|---|---|
| `widgets` | `Widget[]` | All configured widget instances (enabled and disabled). |
| `schemaVersion` | `number` | For forward-compatible migration/repair, matching the existing `configStore` versioning pattern. |

**State transitions**: created with defaults on first load → mutated via
Widget Settings (enable/disable/reorder/edit settings) → persisted on every
change → validated/repaired on every load.

## WidgetDescriptor & WidgetMetadata

The unit a plugin module registers with `widgetRegistry`. Not persisted —
rebuilt in memory every load from the installed plugin modules under
`src/plugins/`.

**WidgetDescriptor**

| Field | Type | Notes |
|---|---|---|
| `type` | `WidgetType` | Same union as `Widget.type`; the registry key. |
| `metadata` | `WidgetMetadata` | See below — display info for `WidgetSettings`. |
| `component` | `() => Promise<{ default: ComponentType<WidgetProps> }>` | Dynamic import used by `lazyLoad()`; never eagerly imported by `Workspace`. |
| `defaultSettings` | `WidgetSettings` (the same discriminated union used by `Widget.settings`) | Seeds a new `Widget` instance when the user first enables this type. |
| `allowedColumns` | `("left" \| "center" \| "right")[]` | Which columns this widget type may be placed in (e.g. `shortcuts` may be restricted to `center`). |

**WidgetMetadata**

| Field | Type | Notes |
|---|---|---|
| `displayName` | `string` | Shown in `WidgetSettings`' widget list. |
| `description` | `string` | Short one-line explanation shown alongside the enable toggle. |
| `requiresConfig` | `boolean` | `true` for `server-status`/`docker-status` (needs a `MonitoringSourceConfig`) — drives the `not-configured` UI state. |

**Validation rules**: `register()` on a `type` that's already registered MUST
throw during development/tests (fail loud — a duplicate registration is a
programming error, not a runtime/user-facing condition) but MUST NOT crash a
production dashboard load; `unregister()` on an unknown `type` is a no-op.
`getMetadata()`/`load()`/`lazyLoad()` on an unregistered `type` return
`undefined`/reject, handled by `Workspace` as an unknown-widget skip (same
repair path as an unrecognized persisted `Widget.type`).

## Breakpoint & ResolvedLayout

Not persisted — computed by `layoutEngine` on every render-relevant change
(viewport resize, widget layout edit, plugin registration change).

| Type | Shape | Notes |
|---|---|---|
| `Breakpoint` | `"desktop" \| "tablet" \| "phone"` | Derived from `matchMedia` against thresholds in `src/design/breakpoints.ts`; `"phone"` is best-effort per the constitution's Responsive principle. |
| `ResolvedLayout` | `{ left: Widget[]; center: Widget[]; right: Widget[] }` | The per-column, ordered, enabled-only widget list `Workspace` actually renders for the current `Breakpoint` — e.g. at `"tablet"`, `right` may be folded into `center` per `layoutEngine`'s reflow rule, without mutating the persisted `WidgetLayout`. |

**Validation rules**: `ResolvedLayout` is always derivable from a valid
`WidgetLayout` + registered widget metadata + current `Breakpoint` — it has no
independent validity of its own and is never persisted, so there is nothing to
repair here (repair happens upstream, on `WidgetLayout`).

## SearchSource & SearchResult

Not persisted — `SearchSource`s are registered in memory with `searchEngine`
at startup (mirroring how Widgets register with `widgetRegistry`); results are
computed per keystroke.

| Type | Shape | Notes |
|---|---|---|
| `SearchSource` | `{ id: string; label: string; kind: "web" \| "shortcut" \| "command"; match: (query: string) => SearchResult[] }` | `match` MUST be synchronous and side-effect-free (no network calls), so `searchEngine.query()` never blocks the UI thread waiting on I/O. |
| `SearchResult` | `{ id: string; sourceId: string; label: string; description?: string; icon?: IconSource; onSelect: () => void }` | `onSelect` performs the actual navigation/action (open URL, jump to shortcut, open a `SettingsDrawer` section via `eventBus`) — `searchEngine` itself never navigates or mutates state directly. |

**Validation rules**: A `SearchSource.id` MUST be unique; a second
`registerSource()` call with a duplicate `id` MUST throw in development/tests,
matching `widgetRegistry`'s duplicate-registration behavior for consistency.

## ThemePreferences

Replaces a single flat theme object with six independently persisted groups,
each owned by one area of the app and exposed together via `ThemeProvider`.
Extends the existing `001` theme preference rather than discarding it.

| Group | Type | Notes |
|---|---|---|
| `theme` | `{ mode: "light" \| "dark" \| "system" }` | Existing light/dark preference from feature 001, unchanged in shape. |
| `appearance` | `{ accentColor: string; density: "comfortable" \| "compact" }` | Non-glass visual preferences layered on the design tokens. |
| `wallpaper` | `BackgroundConfig` | See below — owned/resolved by `backgroundEngine`. |
| `glass` | `{ intensity: "low" \| "medium" \| "high"; borderStrength: "subtle" \| "visible" }` | Selects among predefined `src/design/glass.ts` token presets — never an arbitrary blur/opacity value, to preserve one-material consistency. |
| `animations` | `{ reducedMotion: "system" \| "always" \| "never"; transitionSpeed: "normal" \| "fast" \| "off" }` | Extends existing reduced-motion handling with a speed dial for functional transitions. |
| `accessibility` | `{ contrastBoost: boolean; focusRingStyle: "default" \| "high-visibility"; fontScale: number }` | Extends feature 001's accessibility support; `fontScale` is schema-bounded (e.g. 0.9–1.5). |

**Validation rules**: Each group validates/repairs independently — an invalid
`accessibility.fontScale`, for example, resets only that field to default
rather than discarding the other five groups. `styleVariant` from the earlier
single-object model is dropped: with `glass` now a first-class group, "glass"
is simply the current (and only) style, not a separate selector.

## BackgroundConfig

| Field | Type | Notes |
|---|---|---|
| `source` | `"default" \| "custom-url" \| "custom-upload"` | How the background image is provided. |
| `value` | `string \| null` | Bundled default asset id, an image URL, or a persisted local reference, depending on `source`. |
| `dimOverlay` | `number` (0–1) | Opacity of a dark scrim applied over the image to preserve text contrast; defaults to a value validated against contrast requirements. |
| `blurPx` | `number` (0–40) | Background blur radius applied by `backgroundEngine`; `0` disables blur. |
| `gradient` | `{ from: string; to: string; angleDeg: number } \| null` | Optional gradient layer composited over/instead of the image (e.g. for the no-image default state). |

**Validation rules**: `source: "custom-url"` requires a well-formed URL string
(HTTP/HTTPS only); invalid/unreachable values fall back to `source: "default"`
on load without blocking render. `blurPx` and `dimOverlay` are clamped to their
valid ranges on load rather than rejected, so a corrupted value degrades to a
safe visual rather than failing validation entirely. All computation over
these fields (resolving the final CSS-ready background state) is owned by the
`backgroundEngine` service — components read its output, they don't recompute
it.

## MonitoringSourceConfig

Connection details used by the `server-status` and `docker-status` widgets.

| Field | Type | Notes |
|---|---|---|
| `endpointUrl` | `string \| null` | User-configured HTTP(S) endpoint implementing the contract in [contracts/monitoring-api-contract.md](./contracts/monitoring-api-contract.md). `null` means "not configured yet." |
| `pollIntervalSeconds` | `number` | How often widgets refresh; sane default (e.g. 60s), min/max bounds enforced by schema. |
| `timeoutMs` | `number` | Request timeout before the widget shows an "unavailable" state; bounded default (e.g. 5000ms). |

**Validation rules**: Missing/invalid `endpointUrl` results in the
`server-status`/`docker-status` widgets rendering a "not configured" state
(distinct from "unavailable") that links to Widget Settings — never a crash or
blocked render.

## Note

Content owned by the `notes` widget.

| Field | Type | Notes |
|---|---|---|
| `content` | `string` | Freeform text, size-bounded (schema-enforced max length) to keep persistence and render performant per Edge Cases. |
| `updatedAt` | `string` (ISO 8601) | Last local edit timestamp. |

**Validation rules**: Oversized content is truncated with a visible notice
rather than silently dropped or crashing persistence.

## IconSource

The resolved icon for a single shortcut, produced and cached by the
`iconProvider` service. Added as a new optional field (`icon: IconSource`) on
the existing `Shortcut` entity from feature 001.

| Field | Type | Notes |
|---|---|---|
| `provider` | `"lucide" \| "simple-icons" \| "custom-svg" \| "favicon" \| "fallback"` | Which provider ultimately resolved the icon, in the fixed preference order defined in [contracts/icon-provider-contract.md](./contracts/icon-provider-contract.md). |
| `value` | `string` | Lucide icon name, Simple Icons slug, inline/reference SVG, cached favicon data reference, or the fallback initials string, depending on `provider`. |
| `resolvedAt` | `string` (ISO 8601) | When resolution last ran; used to allow a manual "re-check icon" action without auto re-fetching on every load. |

**Validation rules**: A `Shortcut` with no `icon` (e.g. created before this
field existed, or resolution never completed) renders the `"fallback"`
provider at read time rather than blocking on a fetch — resolution only runs
when the user explicitly (re)saves the shortcut in `SettingsDrawer`.

## StorageProvider (infrastructure interface, not a domain entity)

Not part of the domain model — documented here because every persisted entity
above (`WidgetLayout`, `ThemePreferences`, `MonitoringSourceConfig`, `Note`,
`Shortcut.icon`) reaches storage exclusively through it.

| Method | Signature | Notes |
|---|---|---|
| `get` | `<T>(key: string) => T \| undefined` | Synchronous read; `configStore` deserializes/validates the result against the relevant schema. |
| `set` | `<T>(key: string, value: T) => void` | Synchronous write. |
| `remove` | `(key: string) => void` | Used by config repair when a key is unsalvageable. |

**Validation rules**: `StorageProvider` itself does no schema validation —
that stays in `configStore`/`schema.ts`, so a future `CloudStorageProvider`
doesn't need to duplicate validation logic. `LocalStorageProvider` MUST NOT
throw on a full/unavailable `localStorage` (e.g. private browsing quota) — it
degrades to an in-memory-only no-op with the same synchronous interface, so
`configStore`'s callers never need a storage-availability check of their own.

## Relationship to existing entities (feature 001)

- **Shortcut** and **Category** (from `001-browser-dashboard`) are extended,
  not replaced: `Shortcut` gains the optional `icon: IconSource` field above;
  shape and behavior are otherwise unchanged. The new `shortcuts` widget type
  renders the existing shortcut/category data inside a `GlassPanel`-wrapped
  widget frame instead of a fixed dashboard section.
- `WidgetLayout`, `ThemePreferences` (and its six groups), `MonitoringSourceConfig`,
  and `Note` are new top-level keys added to the existing typed
  configuration/persistence system (`configStore.ts` + `schema.ts`), not a
  parallel storage mechanism. `WidgetDescriptor`/`WidgetMetadata` are the one
  exception — in-memory only, rebuilt from plugin modules on every load, never
  persisted.
