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
