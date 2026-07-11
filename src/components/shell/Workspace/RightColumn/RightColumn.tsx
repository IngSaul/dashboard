import { WorkspaceColumn } from '../WorkspaceColumn'
import type { Widget } from '../../../../types/widgets'

export interface RightColumnProps {
  widgets: Widget[]
}

/** Secondary column (calendar, notes, and future widgets) — see design-reference.md. */
export function RightColumn({ widgets }: RightColumnProps) {
  return <WorkspaceColumn widgets={widgets} className="workspace-column--right" label="Widgets secundarios" />
}
