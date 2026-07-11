import { defaultEventBus } from './eventBus'
import { defaultSearchEngine } from './searchEngine'
import { registerWebSearchSource } from './search'
import { registerShortcutSearchSource } from './shortcuts'
import type { SettingsSectionId } from '../types/events'
import type { SearchResult } from '../types/search'

const SETTINGS_COMMANDS: { section: SettingsSectionId; label: string }[] = [
  { section: 'widgets', label: 'Open Widget Settings' },
  { section: 'theme', label: 'Open Theme Settings' },
  { section: 'appearance', label: 'Open Appearance Settings' },
  { section: 'wallpaper', label: 'Open Wallpaper Settings' },
  { section: 'glass', label: 'Open Glass Settings' },
  { section: 'animations', label: 'Open Animation Settings' },
  { section: 'accessibility', label: 'Open Accessibility Settings' },
]

/**
 * Registers the static settings-navigation `SearchSource` (T095) —
 * `CommandPalette`-only commands (kind `"command"`) that open a given
 * `SettingsDrawer` section via `eventBus`, never by importing
 * `SettingsDrawer`/`SettingsState` directly (UI contract's AppShell rule:
 * cross-slice interaction goes through `eventBus`).
 */
function registerSettingsCommandSource(): void {
  defaultSearchEngine.registerSource({
    id: 'commands',
    label: 'Commands',
    kind: 'command',
    match(query): SearchResult[] {
      const lowerQuery = query.trim().toLowerCase()
      if (lowerQuery.length === 0) {
        return []
      }
      return SETTINGS_COMMANDS.filter((command) => command.label.toLowerCase().includes(lowerQuery)).map(
        (command): SearchResult => ({
          id: `command-open-${command.section}`,
          sourceId: 'commands',
          label: command.label,
          onSelect: () => defaultEventBus.emit('settings:open-section', { section: command.section }),
        }),
      )
    },
  })
}

/**
 * Registers every built-in `SearchSource` (T093-T095): called once during
 * app init (see `main.tsx`), before `AppShell` mounts — the same bootstrap
 * point as `registerBuiltInPlugins()`, so `SearchBar`/`CommandPalette`
 * always have their sources available before first render.
 */
export function registerBuiltInSearchSources(): void {
  registerWebSearchSource()
  registerShortcutSearchSource()
  registerSettingsCommandSource()
}
