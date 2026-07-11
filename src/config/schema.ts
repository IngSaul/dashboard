import type { GlassBorderStrength, GlassIntensity } from '../design/glass'
import { createDefaultDashboardConfig, DEFAULT_DASHBOARD_CONFIG_VERSION } from './defaults'
import type {
  DashboardConfiguration,
  ResolvedThemeMode,
  SearchOpenBehavior,
  SearchPreference,
  Shortcut,
  ShortcutCategory,
  ThemeMode,
  ThemePreference,
  WeatherLocationMode,
  WeatherPreference,
  WeatherUnits,
} from '../types/dashboard'
import type {
  BackgroundConfig,
  BackgroundGradient,
  IconProviderKind,
  IconSource,
  MonitoringSourceConfig,
  Note,
  ThemePreferences,
  Widget,
  WidgetColumn,
  WidgetLayout,
  WidgetType,
} from '../types/widgets'

/**
 * Configuration validation and repair.
 *
 * Accepts an already-parsed but untrusted value (e.g. `JSON.parse` output
 * from `localStorage`) and always returns a complete, valid
 * `DashboardConfiguration`. Missing or malformed sections fall back to their
 * corresponding default; malformed individual records are dropped rather
 * than discarding the whole section. See `data-model.md` validation rules.
 */

const SEARCH_QUERY_PLACEHOLDER = '{query}'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyTrimmedString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

function isValidUrlString(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return false
  }
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

export function isShortcutCategory(value: unknown): value is ShortcutCategory {
  if (!isPlainObject(value)) {
    return false
  }
  return (
    isNonEmptyTrimmedString(value.id) &&
    isNonEmptyTrimmedString(value.name) &&
    isFiniteNumber(value.order) &&
    isBoolean(value.isVisible) &&
    isNonEmptyTrimmedString(value.createdAt) &&
    isNonEmptyTrimmedString(value.updatedAt)
  )
}

export function isShortcut(value: unknown): value is Shortcut {
  if (!isPlainObject(value)) {
    return false
  }
  if (
    !isNonEmptyTrimmedString(value.id) ||
    !isNonEmptyTrimmedString(value.label) ||
    !isValidUrlString(value.url) ||
    !isFiniteNumber(value.order) ||
    !isNonEmptyTrimmedString(value.createdAt) ||
    !isNonEmptyTrimmedString(value.updatedAt)
  ) {
    return false
  }
  if (value.categoryId !== undefined && !isNonEmptyTrimmedString(value.categoryId)) {
    return false
  }
  if (value.description !== undefined && typeof value.description !== 'string') {
    return false
  }
  if (value.icon !== undefined && !isIconSource(value.icon)) {
    return false
  }
  return true
}

function repairThemePreference(
  raw: unknown,
  fallback: ThemePreference,
): ThemePreference {
  if (!isPlainObject(raw)) {
    return fallback
  }
  const validModes: ThemeMode[] = ['light', 'dark', 'system']
  const validResolvedModes: ResolvedThemeMode[] = ['light', 'dark']
  const mode = validModes.includes(raw.mode as ThemeMode) ? (raw.mode as ThemeMode) : undefined
  const resolvedMode = validResolvedModes.includes(raw.resolvedMode as ResolvedThemeMode)
    ? (raw.resolvedMode as ResolvedThemeMode)
    : undefined
  if (!mode || !resolvedMode) {
    return fallback
  }
  return { mode, resolvedMode }
}

function repairSearchPreference(
  raw: unknown,
  fallback: SearchPreference,
): SearchPreference {
  if (!isPlainObject(raw)) {
    return fallback
  }
  const validOpenBehaviors: SearchOpenBehavior[] = ['currentTab', 'newTab']
  const providerName = raw.providerName
  const searchUrlTemplate = raw.searchUrlTemplate
  const openBehavior = raw.openBehavior
  if (
    !isNonEmptyTrimmedString(providerName) ||
    !isNonEmptyTrimmedString(searchUrlTemplate) ||
    !searchUrlTemplate.includes(SEARCH_QUERY_PLACEHOLDER) ||
    !validOpenBehaviors.includes(openBehavior as SearchOpenBehavior)
  ) {
    return fallback
  }
  return {
    providerName,
    searchUrlTemplate,
    openBehavior: openBehavior as SearchOpenBehavior,
  }
}

function repairWeatherPreference(
  raw: unknown,
  fallback: WeatherPreference,
): WeatherPreference {
  if (!isPlainObject(raw)) {
    return fallback
  }
  const validModes: WeatherLocationMode[] = ['configuredLocation', 'browserLocation']
  const validUnits: WeatherUnits[] = ['metric', 'imperial']
  const mode = raw.mode
  const units = raw.units
  const enabled = raw.enabled
  if (
    !validModes.includes(mode as WeatherLocationMode) ||
    !validUnits.includes(units as WeatherUnits) ||
    !isBoolean(enabled)
  ) {
    return fallback
  }
  if (raw.locationLabel !== undefined && !isNonEmptyTrimmedString(raw.locationLabel)) {
    return fallback
  }
  return {
    mode: mode as WeatherLocationMode,
    units: units as WeatherUnits,
    enabled,
    ...(raw.locationLabel !== undefined ? { locationLabel: raw.locationLabel as string } : {}),
  }
}

function repairCategories(raw: unknown): ShortcutCategory[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const seenIds = new Set<string>()
  const categories: ShortcutCategory[] = []
  for (const entry of raw) {
    if (!isShortcutCategory(entry) || seenIds.has(entry.id)) {
      continue
    }
    seenIds.add(entry.id)
    categories.push(entry)
  }
  return categories
}

function repairShortcuts(raw: unknown, validCategories: ShortcutCategory[]): Shortcut[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const validCategoryIds = new Set(validCategories.map((category) => category.id))
  const seenIds = new Set<string>()
  const shortcuts: Shortcut[] = []
  for (const entry of raw) {
    if (!isShortcut(entry) || seenIds.has(entry.id)) {
      continue
    }
    seenIds.add(entry.id)
    const categoryId =
      entry.categoryId !== undefined && validCategoryIds.has(entry.categoryId)
        ? entry.categoryId
        : undefined
    shortcuts.push({
      id: entry.id,
      label: entry.label,
      url: entry.url,
      order: entry.order,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      ...(categoryId !== undefined ? { categoryId } : {}),
      ...(entry.description !== undefined ? { description: entry.description } : {}),
      ...(entry.icon !== undefined ? { icon: entry.icon } : {}),
    })
  }
  return shortcuts
}

// --- 002-widget-dashboard additions ---------------------------------------
//
// Widget layout, the six ThemePreferences groups, background/wallpaper,
// monitoring source, notes, and shortcut icon resolution. Same philosophy as
// above: never throw, drop/fall back at the smallest possible granularity
// (a single malformed widget, not the whole layout; a single invalid
// ThemePreferences group, not the whole preference set) — see
// specs/002-widget-dashboard/data-model.md for the per-entity validation
// rules this mirrors.

const WIDGET_TYPES: WidgetType[] = [
  'clock',
  'weather',
  'server-status',
  'docker-status',
  'calendar',
  'notes',
  'shortcuts',
]

const WIDGET_COLUMNS: WidgetColumn[] = ['left', 'center', 'right']

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function isWidgetType(value: unknown): value is WidgetType {
  return typeof value === 'string' && (WIDGET_TYPES as string[]).includes(value)
}

function isWidgetColumn(value: unknown): value is WidgetColumn {
  return typeof value === 'string' && (WIDGET_COLUMNS as string[]).includes(value)
}

/**
 * `settings` is only checked for being a plain object, not an exact
 * per-type shape: every `WidgetSettingsByType` entry is currently
 * `Record<string, never>`, but a future widget type may add real fields,
 * and repair shouldn't need to change again just because a settings object
 * gained a key it doesn't yet read.
 */
function isWidget(value: unknown): value is Widget {
  if (!isPlainObject(value)) {
    return false
  }
  return (
    isNonEmptyTrimmedString(value.id) &&
    isWidgetType(value.type) &&
    isBoolean(value.enabled) &&
    isWidgetColumn(value.column) &&
    isFiniteNumber(value.order) &&
    isPlainObject(value.settings)
  )
}

/**
 * Repairs the widget layout array: drops malformed entries and duplicate
 * types, then reassigns `order` sequentially within each column (stable on
 * the original order) so every enabled widget has a unique column/order
 * pair — this both satisfies the uniqueness validation rule and implements
 * "append to end of column on conflict" without a separate pass. Falls back
 * to `fallback` entirely if, after repair, both `clock` and `shortcuts`
 * would be disabled (the dashboard must never render fully empty).
 */
function repairWidgetLayout(raw: unknown, fallback: WidgetLayout): WidgetLayout {
  if (!isPlainObject(raw) || !Array.isArray(raw.widgets)) {
    return fallback
  }

  const seenTypes = new Set<WidgetType>()
  const candidates: Widget[] = []
  for (const entry of raw.widgets) {
    if (isWidget(entry) && !seenTypes.has(entry.type)) {
      seenTypes.add(entry.type)
      candidates.push(entry)
    }
  }

  const clockEnabled = candidates.some((widget) => widget.type === 'clock' && widget.enabled)
  const shortcutsEnabled = candidates.some((widget) => widget.type === 'shortcuts' && widget.enabled)
  if (!clockEnabled && !shortcutsEnabled) {
    return fallback
  }

  const widgets = WIDGET_COLUMNS.flatMap((column) =>
    candidates
      .filter((widget) => widget.column === column)
      .sort((a, b) => a.order - b.order)
      .map((widget, index) => ({ ...widget, order: index }) as Widget),
  )

  return {
    widgets,
    schemaVersion: isFiniteNumber(raw.schemaVersion) ? raw.schemaVersion : fallback.schemaVersion,
  }
}

const BACKGROUND_SOURCES: BackgroundConfig['source'][] = ['default', 'custom-url', 'custom-upload']

function isBackgroundGradient(value: unknown): value is BackgroundGradient {
  if (!isPlainObject(value)) {
    return false
  }
  return (
    isNonEmptyTrimmedString(value.from) &&
    isNonEmptyTrimmedString(value.to) &&
    isFiniteNumber(value.angleDeg)
  )
}

/**
 * `blurPx`/`dimOverlay` are clamped rather than rejected, and an invalid
 * `custom-url` falls back to `source: 'default'` specifically (not the
 * whole config), per data-model.md's `BackgroundConfig` validation rules.
 */
function repairBackgroundConfig(raw: unknown, fallback: BackgroundConfig): BackgroundConfig {
  if (!isPlainObject(raw)) {
    return fallback
  }
  const source = (BACKGROUND_SOURCES as string[]).includes(raw.source as string)
    ? (raw.source as BackgroundConfig['source'])
    : undefined
  if (!source) {
    return fallback
  }
  if (source === 'custom-url' && !isValidUrlString(raw.value)) {
    return { ...fallback, source: 'default', value: null }
  }
  const value = raw.value === null || isNonEmptyTrimmedString(raw.value) ? raw.value : fallback.value
  const dimOverlay = isFiniteNumber(raw.dimOverlay) ? clamp(raw.dimOverlay, 0, 1) : fallback.dimOverlay
  const blurPx = isFiniteNumber(raw.blurPx) ? clamp(raw.blurPx, 0, 40) : fallback.blurPx
  const gradient =
    raw.gradient === null
      ? null
      : isBackgroundGradient(raw.gradient)
        ? raw.gradient
        : fallback.gradient

  return { source, value: value as string | null, dimOverlay, blurPx, gradient }
}

const THEME_GROUP_MODES: ThemePreferences['theme']['mode'][] = ['light', 'dark', 'system']
const DENSITIES: ThemePreferences['appearance']['density'][] = ['comfortable', 'compact']
const GLASS_INTENSITIES: GlassIntensity[] = ['low', 'medium', 'high']
const GLASS_BORDER_STRENGTHS: GlassBorderStrength[] = ['subtle', 'visible']
const REDUCED_MOTION_MODES: ThemePreferences['animations']['reducedMotion'][] = [
  'system',
  'always',
  'never',
]
const TRANSITION_SPEEDS: ThemePreferences['animations']['transitionSpeed'][] = [
  'normal',
  'fast',
  'off',
]
const FOCUS_RING_STYLES: ThemePreferences['accessibility']['focusRingStyle'][] = [
  'default',
  'high-visibility',
]

function repairThemeGroup(
  raw: unknown,
  fallback: ThemePreferences['theme'],
): ThemePreferences['theme'] {
  if (!isPlainObject(raw) || !(THEME_GROUP_MODES as string[]).includes(raw.mode as string)) {
    return fallback
  }
  return { mode: raw.mode as ThemePreferences['theme']['mode'] }
}

function repairAppearanceGroup(
  raw: unknown,
  fallback: ThemePreferences['appearance'],
): ThemePreferences['appearance'] {
  if (!isPlainObject(raw)) {
    return fallback
  }
  const accentColor = isNonEmptyTrimmedString(raw.accentColor) ? raw.accentColor : undefined
  const density = (DENSITIES as string[]).includes(raw.density as string)
    ? (raw.density as ThemePreferences['appearance']['density'])
    : undefined
  if (!accentColor || !density) {
    return fallback
  }
  return { accentColor, density }
}

function repairGlassGroup(
  raw: unknown,
  fallback: ThemePreferences['glass'],
): ThemePreferences['glass'] {
  if (!isPlainObject(raw)) {
    return fallback
  }
  const intensity = (GLASS_INTENSITIES as string[]).includes(raw.intensity as string)
    ? (raw.intensity as GlassIntensity)
    : undefined
  const borderStrength = (GLASS_BORDER_STRENGTHS as string[]).includes(raw.borderStrength as string)
    ? (raw.borderStrength as GlassBorderStrength)
    : undefined
  if (!intensity || !borderStrength) {
    return fallback
  }
  return { intensity, borderStrength }
}

function repairAnimationsGroup(
  raw: unknown,
  fallback: ThemePreferences['animations'],
): ThemePreferences['animations'] {
  if (!isPlainObject(raw)) {
    return fallback
  }
  const reducedMotion = (REDUCED_MOTION_MODES as string[]).includes(raw.reducedMotion as string)
    ? (raw.reducedMotion as ThemePreferences['animations']['reducedMotion'])
    : undefined
  const transitionSpeed = (TRANSITION_SPEEDS as string[]).includes(raw.transitionSpeed as string)
    ? (raw.transitionSpeed as ThemePreferences['animations']['transitionSpeed'])
    : undefined
  if (!reducedMotion || !transitionSpeed) {
    return fallback
  }
  return { reducedMotion, transitionSpeed }
}

function repairAccessibilityGroup(
  raw: unknown,
  fallback: ThemePreferences['accessibility'],
): ThemePreferences['accessibility'] {
  if (!isPlainObject(raw)) {
    return fallback
  }
  const contrastBoost = isBoolean(raw.contrastBoost) ? raw.contrastBoost : undefined
  const focusRingStyle = (FOCUS_RING_STYLES as string[]).includes(raw.focusRingStyle as string)
    ? (raw.focusRingStyle as ThemePreferences['accessibility']['focusRingStyle'])
    : undefined
  if (contrastBoost === undefined || !focusRingStyle) {
    return fallback
  }
  const fontScale = isFiniteNumber(raw.fontScale) ? clamp(raw.fontScale, 0.9, 1.5) : fallback.fontScale
  return { contrastBoost, focusRingStyle, fontScale }
}

/** Each of the six groups validates/repairs independently — an invalid group never discards the other five. */
function repairThemePreferences(raw: unknown, fallback: ThemePreferences): ThemePreferences {
  const source = isPlainObject(raw) ? raw : {}
  return {
    theme: repairThemeGroup(source.theme, fallback.theme),
    appearance: repairAppearanceGroup(source.appearance, fallback.appearance),
    wallpaper: repairBackgroundConfig(source.wallpaper, fallback.wallpaper),
    glass: repairGlassGroup(source.glass, fallback.glass),
    animations: repairAnimationsGroup(source.animations, fallback.animations),
    accessibility: repairAccessibilityGroup(source.accessibility, fallback.accessibility),
  }
}

/** Bounds (poll 10-3600s, timeout 500-30000ms) are enforced by clamping, matching the rest of this module's repair-not-reject philosophy. */
function repairMonitoringSourceConfig(
  raw: unknown,
  fallback: MonitoringSourceConfig,
): MonitoringSourceConfig {
  if (!isPlainObject(raw)) {
    return fallback
  }
  const endpointUrl = raw.endpointUrl === null || isValidUrlString(raw.endpointUrl) ? raw.endpointUrl : null
  const pollIntervalSeconds = isFiniteNumber(raw.pollIntervalSeconds)
    ? clamp(raw.pollIntervalSeconds, 10, 3600)
    : fallback.pollIntervalSeconds
  const timeoutMs = isFiniteNumber(raw.timeoutMs) ? clamp(raw.timeoutMs, 500, 30000) : fallback.timeoutMs
  return { endpointUrl: endpointUrl as string | null, pollIntervalSeconds, timeoutMs }
}

/** Shared with `services/notes.ts`'s `saveNote`, which truncates on the write path (and reports it) rather than only here on the repair-on-load path. */
export const NOTE_MAX_LENGTH = 20_000

/** Oversized content is truncated (not dropped) per data-model.md's Note validation rule; the "visible notice" is `NotesWidget`'s concern, not this repair step. */
function repairNote(raw: unknown, fallback: Note): Note {
  if (!isPlainObject(raw) || typeof raw.content !== 'string' || !isNonEmptyTrimmedString(raw.updatedAt)) {
    return fallback
  }
  const content = raw.content.length > NOTE_MAX_LENGTH ? raw.content.slice(0, NOTE_MAX_LENGTH) : raw.content
  return { content, updatedAt: raw.updatedAt }
}

const ICON_PROVIDERS: IconProviderKind[] = ['lucide', 'simple-icons', 'custom-svg', 'favicon', 'fallback']

/** Validates a `Shortcut.icon` field (002-widget-dashboard, US3) — used by `isShortcut` above. */
export function isIconSource(value: unknown): value is IconSource {
  if (!isPlainObject(value)) {
    return false
  }
  return (
    (ICON_PROVIDERS as string[]).includes(value.provider as string) &&
    isNonEmptyTrimmedString(value.value) &&
    isNonEmptyTrimmedString(value.resolvedAt)
  )
}

/**
 * Validates and repairs an untrusted parsed value into a complete
 * `DashboardConfiguration`. Never throws.
 */
export function repairDashboardConfig(raw: unknown): DashboardConfiguration {
  const defaults = createDefaultDashboardConfig()

  if (!isPlainObject(raw) || raw.version !== DEFAULT_DASHBOARD_CONFIG_VERSION) {
    return defaults
  }

  const categories =
    'categories' in raw ? repairCategories(raw.categories) : defaults.categories
  const shortcuts =
    'shortcuts' in raw ? repairShortcuts(raw.shortcuts, categories) : defaults.shortcuts

  return {
    version: DEFAULT_DASHBOARD_CONFIG_VERSION,
    themePreference: repairThemePreference(raw.themePreference, defaults.themePreference),
    searchPreference: repairSearchPreference(raw.searchPreference, defaults.searchPreference),
    weatherPreference: repairWeatherPreference(raw.weatherPreference, defaults.weatherPreference),
    categories,
    shortcuts,
    updatedAt: isNonEmptyTrimmedString(raw.updatedAt) ? raw.updatedAt : defaults.updatedAt,
    widgetLayout: repairWidgetLayout(raw.widgetLayout, defaults.widgetLayout),
    themePreferences: repairThemePreferences(raw.themePreferences, defaults.themePreferences),
    monitoringSourceConfig: repairMonitoringSourceConfig(
      raw.monitoringSourceConfig,
      defaults.monitoringSourceConfig,
    ),
    note: repairNote(raw.note, defaults.note),
  }
}
