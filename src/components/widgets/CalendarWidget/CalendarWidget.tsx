import { useMemo } from 'react'
import { getMonthGrid, type CalendarDay } from '../../../utils/dateTime'
import './CalendarWidget.css'

const monthLabelFormatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
const weekdayLabelFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' })

function dayClassName(day: CalendarDay): string {
  return [
    'calendar-widget__day',
    !day.isCurrentMonth && 'calendar-widget__day--outside',
    day.isToday && 'calendar-widget__day--today',
  ]
    .filter(Boolean)
    .join(' ')
}

/**
 * Local, read-only current-month view (research.md's Calendar widget scope
 * decision): today highlighted, no events, no external sync, no
 * navigation. A native `<table>` gives the standard accessible calendar
 * grid pattern (caption + column-header weekdays + day cells) for free,
 * with no custom ARIA choreography needed. Synchronous/local — no loading
 * state, matching every other locally-derived widget.
 */
export function CalendarWidget() {
  const today = useMemo(() => new Date(), [])
  const grid = useMemo(() => getMonthGrid(today), [today])
  const weeks = useMemo(() => {
    const result: CalendarDay[][] = []
    for (let index = 0; index < grid.length; index += 7) {
      result.push(grid.slice(index, index + 7))
    }
    return result
  }, [grid])
  const weekdayLabels = useMemo(
    () => grid.slice(0, 7).map((day) => weekdayLabelFormatter.format(day.date)),
    [grid],
  )

  return (
    <table className="calendar-widget">
      <caption className="calendar-widget__month">{monthLabelFormatter.format(today)}</caption>
      <thead>
        <tr>
          {weekdayLabels.map((label, index) => (
            <th key={index} scope="col" className="calendar-widget__weekday">
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week) => (
          <tr key={week[0]?.date.toISOString()}>
            {week.map((day) => (
              <td
                key={day.date.toISOString()}
                className={dayClassName(day)}
                aria-current={day.isToday ? 'date' : undefined}
              >
                {day.date.getDate()}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
