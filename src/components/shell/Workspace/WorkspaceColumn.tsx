import type { ReactNode } from 'react'
import { WidgetSlot } from './WidgetSlot'
import type { Widget } from '../../../types/widgets'

export interface WorkspaceColumnProps {
  widgets: Widget[]
  className: string
  label: string
  /** Fixed chrome rendered before the widget list (e.g. `CenterColumn`'s `SearchBar`) — not a registered `Widget`, so it isn't part of `widgets`/`WorkspaceState`. */
  children?: ReactNode
}

/**
 * Shared per-column renderer used by `LeftColumn`/`CenterColumn`/
 * `RightColumn` — every column maps its already-resolved widget list onto a
 * `WidgetSlot` identically; only width/emphasis differs, via `className`
 * (see design-reference.md's column widths). Renders nothing extra when
 * `widgets` is empty and there's no fixed chrome — `WorkspaceColumn.css`'s
 * `:empty` rule collapses it without leaving a gap, per the UI contract's
 * Widget Grid rules.
 */
export function WorkspaceColumn({ widgets, className, label, children }: WorkspaceColumnProps) {
  return (
    <div className={`workspace-column ${className}`.trim()} aria-label={label}>
      {children}
      {widgets.map((widget) => (
        <WidgetSlot key={widget.id} widget={widget} />
      ))}
    </div>
  )
}
