import { useState } from 'react'
import { WorkspaceColumn } from '../WorkspaceColumn'
import { SearchBar } from '../../../SearchBar/SearchBar'
import { loadDashboardConfig } from '../../../../services/configStore'
import type { Widget } from '../../../../types/widgets'

export interface CenterColumnProps {
  widgets: Widget[]
}

/**
 * Wider primary column: search bar, then clock/shortcuts widgets — see
 * design-reference.md ("search bar -> clock/date -> quick-filter pills ->
 * shortcut grid"). `SearchBar` is fixed chrome, not a registered `Widget`
 * type, so it's passed as `WorkspaceColumn`'s leading `children` rather
 * than going through `WorkspaceState.resolvedLayout`. `searchPreference`
 * has no owning state slice (like `weatherPreference`) and isn't editable
 * by any UI yet, so a one-time load is sufficient — no live-update wiring
 * needed.
 */
export function CenterColumn({ widgets }: CenterColumnProps) {
  const [searchPreference] = useState(() => loadDashboardConfig().searchPreference)

  return (
    <WorkspaceColumn widgets={widgets} className="workspace-column--center" label="Primary widgets">
      <SearchBar searchPreference={searchPreference} />
    </WorkspaceColumn>
  )
}
