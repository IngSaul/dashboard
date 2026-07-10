import { defaultWidgetRegistry } from '../services/widgetRegistry'
import { calendarPlugin } from './calendar/plugin'
import { clockPlugin } from './clock/plugin'
import { dockerStatusPlugin } from './docker-status/plugin'
import { notesPlugin } from './notes/plugin'
import { serverStatusPlugin } from './server-status/plugin'
import { shortcutsPlugin } from './shortcuts/plugin'
import { weatherPlugin } from './weather/plugin'

/**
 * Registers every built-in widget plugin with `widgetRegistry`. Called once
 * during app init (see `main.tsx`), before `AppShell` mounts, so every
 * widget type is available before `Workspace`/`WidgetSettings` first render
 * (per the UI contract's Widget Registry rule).
 */
export function registerBuiltInPlugins(): void {
  defaultWidgetRegistry.register(clockPlugin)
  defaultWidgetRegistry.register(weatherPlugin)
  defaultWidgetRegistry.register(serverStatusPlugin)
  defaultWidgetRegistry.register(dockerStatusPlugin)
  defaultWidgetRegistry.register(calendarPlugin)
  defaultWidgetRegistry.register(notesPlugin)
  defaultWidgetRegistry.register(shortcutsPlugin)
}
