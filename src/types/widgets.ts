import type { ComponentType } from 'react'
import type { GlassBorderStrength, GlassIntensity } from '../design/glass'

/**
 * Widget dashboard domain types (002-widget-dashboard).
 *
 * Mirrors the entities described in
 * `specs/002-widget-dashboard/data-model.md`. Deliberately self-contained
 * (no imports from `./dashboard`) even though a couple of shapes overlap in
 * spirit with feature-001 types (e.g. theme mode) — these are new top-level
 * configuration keys layered onto `DashboardConfiguration`, not a rewrite of
 * feature 001's types, and staying self-contained avoids a circular import
 * between this module and `./dashboard`. All date/time fields are ISO 8601
 * strings.
 */

// Widgets

export type WidgetColumn = 'left' | 'center' | 'right'

/**
 * Per-widget-type settings. Every type is currently a no-fields placeholder
 * (`Record<string, never>`) because this feature's real per-widget
 * configuration lives in separate top-level entities (`MonitoringSourceConfig`,
 * `Note`, `Shortcut`/`ShortcutCategory`) — the discriminated union exists so a
 * future widget type can gain real settings without changing this shape.
 */
export interface WidgetSettingsByType {
  clock: Record<string, never>
  weather: Record<string, never>
  'server-status': Record<string, never>
  'docker-status': Record<string, never>
  calendar: Record<string, never>
  notes: Record<string, never>
  shortcuts: Record<string, never>
}

export type WidgetType = keyof WidgetSettingsByType

export type WidgetSettings = WidgetSettingsByType[WidgetType]

interface WidgetBase {
  /** Stable identifier for the instance (supports multiple instances of the same type in future; single instance per type for this feature). */
  id: string
  enabled: boolean
  column: WidgetColumn
  /** Position within its column; lower renders first. */
  order: number
}

/**
 * A single widget instance placed on the dashboard. A discriminated union
 * keyed by `type` so `settings` is always the correctly-shaped settings for
 * that widget's type — assigning e.g. `NotesWidgetSettings` to a `clock`
 * widget is a compile error.
 */
export type Widget = {
  [K in WidgetType]: WidgetBase & { type: K; settings: WidgetSettingsByType[K] }
}[WidgetType]

/** The persisted collection of `Widget` instances plus layout-level metadata. */
export interface WidgetLayout {
  widgets: Widget[]
  /** For forward-compatible migration/repair, matching `configStore`'s versioning pattern. */
  schemaVersion: number
}

// Widget registry

/** Props every widget component receives. */
export interface WidgetProps {
  widget: Widget
}

export interface WidgetMetadata {
  /** Shown in `WidgetSettings`' widget list. */
  displayName: string
  /** Short one-line explanation shown alongside the enable toggle. */
  description: string
  /** `true` for `server-status`/`docker-status` — drives the `not-configured` UI state when no `MonitoringSourceConfig.endpointUrl` is set. */
  requiresConfig: boolean
}

/**
 * The unit a plugin module registers with `widgetRegistry`. Not persisted —
 * rebuilt in memory every load from the installed plugin modules under
 * `src/plugins/`. A discriminated union (like `Widget`) so `defaultSettings`
 * is always correctly shaped for `type`.
 */
export type WidgetDescriptor = {
  [K in WidgetType]: {
    type: K
    metadata: WidgetMetadata
    /** Dynamic import used by `widgetRegistry.lazyLoad()`; never eagerly imported by `Workspace`. */
    component: () => Promise<{ default: ComponentType<WidgetProps> }>
    /** Seeds a new `Widget` instance when the user first enables this type. */
    defaultSettings: WidgetSettingsByType[K]
    /** Which columns this widget type may be placed in. */
    allowedColumns: WidgetColumn[]
  }
}[WidgetType]

// Background / wallpaper

export interface BackgroundGradient {
  from: string
  to: string
  angleDeg: number
}

export interface BackgroundConfig {
  source: 'default' | 'custom-url' | 'custom-upload'
  /** Bundled default asset id, an image URL, or a persisted local reference, depending on `source`. */
  value: string | null
  /** Opacity (0-1) of the dark scrim applied over the image to preserve text contrast. */
  dimOverlay: number
  /** Background blur radius (0-40px) applied by `backgroundEngine`; `0` disables blur. */
  blurPx: number
  /** Optional gradient layer composited over/instead of the image. */
  gradient: BackgroundGradient | null
}

// Theme preferences (six independently persisted groups)

export interface ThemePreferences {
  theme: { mode: 'light' | 'dark' | 'system' }
  appearance: { accentColor: string; density: 'comfortable' | 'compact' }
  wallpaper: BackgroundConfig
  /** Selects among predefined `src/design/glass.ts` token presets — never an arbitrary blur/opacity value. */
  glass: { intensity: GlassIntensity; borderStrength: GlassBorderStrength }
  animations: { reducedMotion: 'system' | 'always' | 'never'; transitionSpeed: 'normal' | 'fast' | 'off' }
  accessibility: {
    contrastBoost: boolean
    focusRingStyle: 'default' | 'high-visibility'
    /** Schema-bounded (e.g. 0.9-1.5). */
    fontScale: number
  }
}

// Monitoring source (server-status / docker-status widgets)

export interface MonitoringSourceConfig {
  /** `null` means "not configured yet." */
  endpointUrl: string | null
  pollIntervalSeconds: number
  timeoutMs: number
}

// Notes

/** Content owned by the `notes` widget. */
export interface Note {
  content: string
  updatedAt: string
}

// Shortcut icon resolution

export type IconProviderKind = 'lucide' | 'simple-icons' | 'custom-svg' | 'favicon' | 'fallback'

/** The resolved icon for a single shortcut, produced and cached by `iconProvider`. */
export interface IconSource {
  provider: IconProviderKind
  /** Lucide icon name, Simple Icons slug, inline/reference SVG, cached favicon data reference, or the fallback initials string, depending on `provider`. */
  value: string
  /** When resolution last ran; allows a manual re-check without auto re-fetching on every load. */
  resolvedAt: string
}
