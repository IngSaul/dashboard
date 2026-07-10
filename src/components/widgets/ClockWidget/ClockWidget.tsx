import { DateTime } from '../../DateTime/DateTime'
import './ClockWidget.css'

/**
 * Displays the current date/time as the dashboard's dominant text element
 * (design-reference.md's typography observations), reusing the existing
 * `DateTime` component's minute-boundary ticking/formatting as-is and only
 * applying the widget's larger display-scale typography around it.
 * Synchronous/local — no loading state, per the UI contract's "default
 * widgets render immediately" rule.
 */
export function ClockWidget() {
  return (
    <div className="clock-widget">
      <DateTime />
    </div>
  )
}
