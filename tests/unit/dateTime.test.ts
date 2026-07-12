import { describe, expect, it } from 'vitest'
import {
  formatDashboardDate,
  formatDashboardTime,
  formatHourLabel,
  getMillisecondsUntilNextMinute,
  getMonthGrid,
  isDifferentCalendarDay,
} from '../../src/utils/dateTime'

describe('formatDashboardDate / formatDashboardTime', () => {
  it('formats a date into a non-empty readable string for initial render', () => {
    const date = new Date(2026, 6, 8, 9, 5, 0, 0)

    expect(formatDashboardDate(date).length).toBeGreaterThan(0)
  })

  it('formats a time into a non-empty readable string for initial render', () => {
    const date = new Date(2026, 6, 8, 9, 5, 0, 0)

    expect(formatDashboardTime(date).length).toBeGreaterThan(0)
  })
})

describe('formatHourLabel', () => {
  it('formats an hour with fixed :00 minutes', () => {
    const date = new Date(2026, 6, 8, 9, 45, 0, 0)

    expect(formatHourLabel(date)).toBe('9:00')
  })

  it('does not pad single-digit hours', () => {
    const date = new Date(2026, 6, 8, 1, 0, 0, 0)

    expect(formatHourLabel(date)).toBe('1:00')
  })
})

describe('getMillisecondsUntilNextMinute', () => {
  it('returns a full minute at the start of a minute', () => {
    const date = new Date(2026, 6, 8, 9, 5, 0, 0)

    expect(getMillisecondsUntilNextMinute(date)).toBe(60_000)
  })

  it('returns the remaining time partway through a minute', () => {
    const date = new Date(2026, 6, 8, 9, 5, 30, 500)

    expect(getMillisecondsUntilNextMinute(date)).toBe(29_500)
  })

  it('returns a small value just before the minute rolls over', () => {
    const date = new Date(2026, 6, 8, 9, 5, 59, 900)

    expect(getMillisecondsUntilNextMinute(date)).toBe(100)
  })
})

describe('isDifferentCalendarDay', () => {
  it('is false for two times on the same day', () => {
    const morning = new Date(2026, 6, 8, 9, 0, 0)
    const evening = new Date(2026, 6, 8, 23, 59, 0)

    expect(isDifferentCalendarDay(morning, evening)).toBe(false)
  })

  it('is true across a midnight rollover', () => {
    const beforeMidnight = new Date(2026, 6, 8, 23, 59, 59)
    const afterMidnight = new Date(2026, 6, 9, 0, 0, 0)

    expect(isDifferentCalendarDay(beforeMidnight, afterMidnight)).toBe(true)
  })

  it('is true across a month/year boundary', () => {
    const newYearsEve = new Date(2026, 11, 31, 23, 59, 59)
    const newYearsDay = new Date(2027, 0, 1, 0, 0, 0)

    expect(isDifferentCalendarDay(newYearsEve, newYearsDay)).toBe(true)
  })
})

describe('getMonthGrid', () => {
  it('returns a fixed 42-day (6-week) grid', () => {
    const grid = getMonthGrid(new Date(2026, 6, 15))

    expect(grid).toHaveLength(42)
  })

  it('starts the grid on a Sunday', () => {
    const grid = getMonthGrid(new Date(2026, 6, 15))

    expect(grid[0]?.date.getDay()).toBe(0)
  })

  it('marks every day belonging to the target month as isCurrentMonth', () => {
    const grid = getMonthGrid(new Date(2026, 6, 15))

    const julyDays = grid.filter((day) => day.isCurrentMonth)
    expect(julyDays).toHaveLength(31)
    expect(julyDays.every((day) => day.date.getMonth() === 6)).toBe(true)
  })

  it('marks leading/trailing days from adjacent months as not isCurrentMonth', () => {
    const grid = getMonthGrid(new Date(2026, 6, 15))

    expect(grid[0]?.isCurrentMonth).toBe(false)
    expect(grid[grid.length - 1]?.isCurrentMonth).toBe(false)
  })

  it('marks exactly one day as isToday, matching the provided today', () => {
    const grid = getMonthGrid(new Date(2026, 6, 1), new Date(2026, 6, 15))

    const todays = grid.filter((day) => day.isToday)
    expect(todays).toHaveLength(1)
    expect(todays[0]?.date.getDate()).toBe(15)
  })

  it('marks no day as isToday when today falls outside the displayed 6-week window', () => {
    const grid = getMonthGrid(new Date(2026, 6, 1), new Date(2026, 9, 1))

    expect(grid.some((day) => day.isToday)).toBe(false)
  })
})
