import { WorkspaceColumn } from '../WorkspaceColumn'
import type { Widget } from '../../../../types/widgets'

export interface CenterColumnProps {
  widgets: Widget[]
}

/**
 * Wider primary column: clock/shortcuts widgets — see design-reference.md
 * ("clock/date -> quick-filter pills -> shortcut grid"). No page-level
 * search box: a plain web page has no way to focus or write into the
 * browser's own address bar (no WebExtensions API exposes that, and this
 * app isn't packaged as an extension), so faking an in-app search box would
 * only mimic — not proxy — the browser's real omnibox. `CommandPalette`
 * (Cmd/Ctrl+K) still covers quick shortcut/command lookup.
 */
export function CenterColumn({ widgets }: CenterColumnProps) {
  return (
    <WorkspaceColumn widgets={widgets} className="workspace-column--center" label="Widgets principales" />
  )
}
