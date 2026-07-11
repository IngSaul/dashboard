import { DEFAULT_GLASS_BORDER_STRENGTH, DEFAULT_GLASS_INTENSITY } from '../design/glass'
import type { DashboardConfiguration } from '../types/dashboard'
import type {
  BackgroundConfig,
  MonitoringSourceConfig,
  Note,
  ThemePreferences,
  Widget,
  WidgetLayout,
} from '../types/widgets'

/**
 * Fallback and first-launch configuration.
 *
 * Used by `schema.ts` (T011) to recover from missing/invalid persisted
 * configuration, and by the dashboard shell on first launch so search,
 * date/time, weather, and shortcut cards are useful before the user
 * personalizes anything (see `data-model.md` and US1 in spec.md).
 */

export const DEFAULT_DASHBOARD_CONFIG_VERSION = 1
export const DEFAULT_WIDGET_LAYOUT_SCHEMA_VERSION = 1

const GENERAL_CATEGORY_ID = 'category-general'

/**
 * Default widget catalog placement (002-widget-dashboard). `clock` and
 * `shortcuts` are enabled by default per data-model.md's validation rule
 * (the dashboard must never render fully empty); the rest exist in the
 * layout so they can be toggled on from `WidgetSettings` without
 * synthesizing a new entry, but start disabled per spec.md's US1
 * acceptance scenario 3 ("only the default widgets: clock + shortcuts").
 * Column placement mirrors design-reference.md's three-column layout:
 * status widgets left, clock/shortcuts center, secondary widgets right.
 */
function createDefaultWidgetLayout(): WidgetLayout {
  const widgets: Widget[] = [
    { id: 'widget-clock', type: 'clock', enabled: true, column: 'center', order: 0, settings: {} },
    { id: 'widget-shortcuts', type: 'shortcuts', enabled: true, column: 'center', order: 1, settings: {} },
    { id: 'widget-weather', type: 'weather', enabled: false, column: 'left', order: 0, settings: {} },
    {
      id: 'widget-server-status',
      type: 'server-status',
      enabled: false,
      column: 'left',
      order: 1,
      settings: {},
    },
    {
      id: 'widget-docker-status',
      type: 'docker-status',
      enabled: false,
      column: 'left',
      order: 2,
      settings: {},
    },
    { id: 'widget-calendar', type: 'calendar', enabled: false, column: 'right', order: 0, settings: {} },
    { id: 'widget-notes', type: 'notes', enabled: false, column: 'right', order: 1, settings: {} },
  ]
  return { widgets, schemaVersion: DEFAULT_WIDGET_LAYOUT_SCHEMA_VERSION }
}

function createDefaultBackgroundConfig(): BackgroundConfig {
  return {
    source: 'default',
    value: null,
    dimOverlay: 0.45,
    blurPx: 0,
    gradient: null,
  }
}

function createDefaultThemePreferences(): ThemePreferences {
  return {
    theme: { mode: 'system' },
    appearance: { accentColor: '#2563eb', density: 'comfortable' },
    wallpaper: createDefaultBackgroundConfig(),
    glass: { intensity: DEFAULT_GLASS_INTENSITY, borderStrength: DEFAULT_GLASS_BORDER_STRENGTH },
    animations: { reducedMotion: 'system', transitionSpeed: 'normal' },
    accessibility: { contrastBoost: false, focusRingStyle: 'default', fontScale: 1 },
  }
}

/** No endpoint configured by default — server-status/docker-status widgets render `not-configured` until the user sets one. */
function createDefaultMonitoringSourceConfig(): MonitoringSourceConfig {
  return {
    endpointUrl: null,
    pollIntervalSeconds: 60,
    timeoutMs: 5000,
  }
}

function createDefaultNote(now: string): Note {
  return { content: '', updatedAt: now }
}

/**
 * Returns a fresh, independent default configuration. A factory (rather than
 * a shared constant) avoids two consumers accidentally mutating the same
 * shortcuts/categories arrays, since user story 2 edits them in place.
 */
export function createDefaultDashboardConfig(): DashboardConfiguration {
  const now = new Date().toISOString()

  return {
    version: DEFAULT_DASHBOARD_CONFIG_VERSION,
    themePreference: {
      mode: 'system',
      resolvedMode: 'light',
    },
    searchPreference: {
      providerName: 'Google',
      searchUrlTemplate: 'https://www.google.com/search?q={query}',
      openBehavior: 'currentTab',
    },
    weatherPreference: {
      mode: 'browserLocation',
      units: 'metric',
      enabled: true,
    },
    categories: [
      {
        id: GENERAL_CATEGORY_ID,
        name: 'General',
        order: 0,
        isVisible: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    shortcuts: [
      {
        id: 'shortcut-gmail',
        label: 'Gmail',
        url: 'https://mail.google.com/',
        categoryId: GENERAL_CATEGORY_ID,
        order: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'shortcut-calendar',
        label: 'Calendario',
        url: 'https://calendar.google.com/',
        categoryId: GENERAL_CATEGORY_ID,
        order: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'shortcut-youtube',
        label: 'YouTube',
        url: 'https://youtube.com/',
        categoryId: GENERAL_CATEGORY_ID,
        order: 2,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'shortcut-github',
        label: 'GitHub',
        url: 'https://github.com/',
        categoryId: GENERAL_CATEGORY_ID,
        order: 3,
        createdAt: now,
        updatedAt: now,
      },
    ],
    updatedAt: now,
    widgetLayout: createDefaultWidgetLayout(),
    themePreferences: createDefaultThemePreferences(),
    monitoringSourceConfig: createDefaultMonitoringSourceConfig(),
    note: createDefaultNote(now),
  }
}
