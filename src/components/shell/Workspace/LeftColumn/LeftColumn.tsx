import { WorkspaceColumn } from '../WorkspaceColumn'
import type { Widget } from '../../../../types/widgets'

export interface LeftColumnProps {
  widgets: Widget[]
}

/** Narrower column for compact status widgets (weather, server/Docker status) — see design-reference.md. */
export function LeftColumn({ widgets }: LeftColumnProps) {
  return <WorkspaceColumn widgets={widgets} className="workspace-column--left" label="Widgets de estado" />
}
