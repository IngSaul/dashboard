import { describe, expect, it } from 'vitest'
import {
  formatDashboardDate,
  formatDashboardTime,
  getMillisecondsUntilNextMinute,
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
