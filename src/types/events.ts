import type { WidgetType } from './widgets'

/**
 * Application event types (002-widget-dashboard). See
 * `specs/002-widget-dashboard/plan.md#global-state-architecture` — `eventBus`
 * carries cross-slice notifications so e.g. `SearchState`'s `CommandPalette`
 * can tell `SettingsState` to open a section without importing
 * `SettingsDrawer` directly, and `PluginState` can announce a registration
 * change so `WorkspaceState` recomputes its `ResolvedLayout`.
 */

/** The six independently editable `ThemePreferences` sections, plus widget management, as shown in `SettingsDrawer`. */
export type SettingsSectionId =
  | 'widgets'
  | 'theme'
  | 'appearance'
  | 'wallpaper'
  | 'glass'
  | 'animations'
  | 'accessibility'

/**
 * Event name -> payload map. `eventBus.emit`/`on`/`off` are generic over
 * `keyof EventMap`, so a payload can never be emitted/handled under the
 * wrong event name.
 */
export interface EventMap {
  /** A widget type was registered/unregistered with `widgetRegistry`, or a widget instance's enabled/order/column state changed. */
  'widget-registry:changed': { type: WidgetType }
  /** A `CommandPalette`/quick-action result wants `SettingsDrawer` opened to a specific section. */
  'settings:open-section': { section: SettingsSectionId }
}

export type EventName = keyof EventMap
