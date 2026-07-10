import { cloneElement, useId, type ReactElement } from 'react'
import './GlassTooltip.css'

export interface GlassTooltipProps {
  /** Tooltip text. */
  label: string
  /** A single focusable/hoverable element (e.g. a `GlassIconButton`). */
  children: ReactElement<{ 'aria-describedby'?: string }>
}

/**
 * Hover/focus hint for a single trigger element (e.g. a widget's overflow
 * icon, a truncated shortcut label). Reveal is pure CSS
 * (`:hover`/`:focus-within`) so there is no JS timing/positioning logic to
 * get wrong; the description is always present in the accessibility tree
 * via `aria-describedby`, not only while visually shown.
 */
export function GlassTooltip({ label, children }: GlassTooltipProps) {
  const tooltipId = useId()

  return (
    <span className="glass-tooltip">
      {cloneElement(children, { 'aria-describedby': tooltipId })}
      <span role="tooltip" id={tooltipId} className="glass-tooltip__bubble">
        {label}
      </span>
    </span>
  )
}
