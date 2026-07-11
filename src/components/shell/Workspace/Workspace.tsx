import { useWorkspaceState } from '../../../state/WorkspaceProvider'
import { resolveWorkspaceColumnsKey } from '../../../services/layoutEngine'
import { CenterColumn } from './CenterColumn/CenterColumn'
import { LeftColumn } from './LeftColumn/LeftColumn'
import { RightColumn } from './RightColumn/RightColumn'
import './Workspace.css'

/**
 * Renders `WorkspaceState.resolvedLayout`'s three columns. Contains no
 * layout math of its own — breakpoint detection, column reflow, and widget
 * ordering all live in `layoutEngine` (see the UI contract's Layout Engine
 * rules); this component only maps the already-resolved per-column widget
 * lists onto `LeftColumn`/`CenterColumn`/`RightColumn`, plus the active
 * column key (also from `layoutEngine`) onto `data-columns` so
 * `Workspace.css` never reserves a grid track for a column with nothing in
 * it.
 */
export function Workspace() {
  const { resolvedLayout } = useWorkspaceState()

  return (
    <div className="workspace" data-columns={resolveWorkspaceColumnsKey(resolvedLayout)}>
      <LeftColumn widgets={resolvedLayout.left} />
      <CenterColumn widgets={resolvedLayout.center} />
      <RightColumn widgets={resolvedLayout.right} />
    </div>
  )
}
