import { WorkspaceColumn } from '../WorkspaceColumn'
import type { Widget } from '../../../../types/widgets'

export interface CenterColumnProps {
  widgets: Widget[]
}

/** Wider primary column (clock, shortcuts) — see design-reference.md. */
export function CenterColumn({ widgets }: CenterColumnProps) {
  return <WorkspaceColumn widgets={widgets} className="workspace-column--center" label="Primary widgets" />
}
