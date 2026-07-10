import { useWorkspaceState } from '../../../state/WorkspaceProvider'
import { CenterColumn } from './CenterColumn/CenterColumn'
import { LeftColumn } from './LeftColumn/LeftColumn'
import { RightColumn } from './RightColumn/RightColumn'
import './Workspace.css'

/**
 * Renders `WorkspaceState.resolvedLayout`'s three columns. Contains no
 * layout math of its own — breakpoint detection, column reflow, and widget
 * ordering all live in `layoutEngine` (see the UI contract's Layout Engine
 * rules); this component only maps the already-resolved per-column widget
 * lists onto `LeftColumn`/`CenterColumn`/`RightColumn`.
 */
export function Workspace() {
  const { resolvedLayout } = useWorkspaceState()

  return (
    <div className="workspace">
      <LeftColumn widgets={resolvedLayout.left} />
      <CenterColumn widgets={resolvedLayout.center} />
      <RightColumn widgets={resolvedLayout.right} />
    </div>
  )
}
