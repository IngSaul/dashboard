import { PluginProvider } from '../../../state/PluginProvider'
import { SearchProvider } from '../../../state/SearchProvider'
import { SettingsProvider } from '../../../state/SettingsProvider'
import { ThemeProvider } from '../../../state/ThemeProvider'
import { WorkspaceProvider } from '../../../state/WorkspaceProvider'
import { BackgroundLayer } from '../BackgroundLayer/BackgroundLayer'
import { CommandPalette } from '../CommandPalette/CommandPalette'
import { SettingsDrawer } from '../SettingsDrawer/SettingsDrawer'
import { Workspace } from '../Workspace/Workspace'
import './AppShell.css'

/**
 * Single top-level composition root (per the UI contract's AppShell rule):
 * composes the five state slices, then renders, in layering order,
 * `BackgroundLayer`, `Workspace`, `SettingsDrawer`, and `CommandPalette`. No
 * dashboard content renders outside this shell. Provider nesting order is
 * arbitrary — the five slices never read each other's context directly,
 * only communicate via `eventBus` (see plan.md's Global State Architecture).
 */
export function AppShell() {
  return (
    <ThemeProvider>
      <PluginProvider>
        <WorkspaceProvider>
          <SettingsProvider>
            <SearchProvider>
              <div className="app-shell">
                <BackgroundLayer />
                <Workspace />
                <SettingsDrawer />
                <CommandPalette />
              </div>
            </SearchProvider>
          </SettingsProvider>
        </WorkspaceProvider>
      </PluginProvider>
    </ThemeProvider>
  )
}
