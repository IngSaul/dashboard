import { useEffect, useState } from 'react'
import {
  formatDashboardDate,
  formatDashboardTime,
  getMillisecondsUntilNextMinute,
} from '../../utils/dateTime'
import './DateTime.css'

/**
 * Displays the current date and time, updating on minute boundaries. This
 * naturally rolls the visible date over at midnight without a dedicated
 * timer (UI contract's date/time section).
 */
export function DateTime() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>

    function scheduleNextTick() {
      const delay = getMillisecondsUntilNextMinute(new Date())
      timeoutId = setTimeout(() => {
        setNow(new Date())
        scheduleNextTick()
      }, delay)
    }

    scheduleNextTick()
    return () => clearTimeout(timeoutId)
  }, [])

  return (
    <div className="date-time" role="group" aria-label="Fecha y hora actual">
      <span className="date-time__date">{formatDashboardDate(now)}</span>
      <span className="date-time__time">{formatDashboardTime(now)}</span>
    </div>
  )
}
