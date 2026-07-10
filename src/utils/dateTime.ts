/**
 * Date/time formatting and scheduling helpers for the dashboard clock.
 *
 * The clock re-renders on minute boundaries rather than every second, which
 * is enough for "current date and time" display and naturally rolls the
 * visible date over at midnight without a dedicated midnight-only timer.
 */

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
})

export function formatDashboardDate(date: Date): string {
  return dateFormatter.format(date)
}

export function formatDashboardTime(date: Date): string {
  return timeFormatter.format(date)
}

/** Milliseconds until the start of the next minute, for scheduling clock updates. */
export function getMillisecondsUntilNextMinute(date: Date): number {
  const secondsIntoMinute = date.getSeconds()
  const millisecondsIntoSecond = date.getMilliseconds()
  const elapsedMs = secondsIntoMinute * 1000 + millisecondsIntoSecond
  return 60_000 - elapsedMs
}

/** True when `previous` and `current` fall on different calendar days. */
export function isDifferentCalendarDay(previous: Date, current: Date): boolean {
  return (
    previous.getFullYear() !== current.getFullYear() ||
    previous.getMonth() !== current.getMonth() ||
    previous.getDate() !== current.getDate()
  )
}

export interface CalendarDay {
  date: Date
  /** False for the leading/trailing days from adjacent months shown to fill out the grid's first/last week. */
  isCurrentMonth: boolean
  isToday: boolean
}

/**
 * Builds a fixed 42-day (6-week) grid for the month containing `date`,
 * starting on Sunday, padded with adjacent-month days so every week is
 * full. Used by `CalendarWidget`'s local, read-only, current-month-only
 * view (research.md's Calendar widget scope decision) — no event data, no
 * navigation.
 */
export function getMonthGrid(date: Date, today: Date = date): CalendarDay[] {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const gridStart = new Date(year, month, 1 - firstOfMonth.getDay())

  const days: CalendarDay[] = []
  for (let offset = 0; offset < 42; offset += 1) {
    const day = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + offset)
    days.push({
      date: day,
      isCurrentMonth: day.getMonth() === month,
      isToday: !isDifferentCalendarDay(day, today),
    })
  }
  return days
}
