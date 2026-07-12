import { describe, expect, it } from 'vitest'
import { mapWeatherCodeToIllustrationKind } from '../../src/services/weatherIllustrationMap'

/**
 * Pure WMO code -> illustration bucket lookup, distinct from `weather.ts`'s
 * `describeWeatherCode` (human-readable Spanish text). Each case below
 * mirrors a code Open-Meteo's `current_weather.weathercode` can actually
 * return.
 */
describe('mapWeatherCodeToIllustrationKind', () => {
  it('maps clear-sky codes to sunny', () => {
    expect(mapWeatherCodeToIllustrationKind(0)).toBe('sunny')
    expect(mapWeatherCodeToIllustrationKind(1)).toBe('sunny')
  })

  it('maps partly cloudy to partly-cloudy', () => {
    expect(mapWeatherCodeToIllustrationKind(2)).toBe('partly-cloudy')
  })

  it('maps overcast to cloudy', () => {
    expect(mapWeatherCodeToIllustrationKind(3)).toBe('cloudy')
  })

  it('maps fog codes to fog', () => {
    expect(mapWeatherCodeToIllustrationKind(45)).toBe('fog')
    expect(mapWeatherCodeToIllustrationKind(48)).toBe('fog')
  })

  it('maps drizzle and slight rain/showers to light-rain', () => {
    expect(mapWeatherCodeToIllustrationKind(51)).toBe('light-rain')
    expect(mapWeatherCodeToIllustrationKind(61)).toBe('light-rain')
    expect(mapWeatherCodeToIllustrationKind(80)).toBe('light-rain')
  })

  it('maps moderate/heavy rain and violent showers to heavy-rain', () => {
    expect(mapWeatherCodeToIllustrationKind(63)).toBe('heavy-rain')
    expect(mapWeatherCodeToIllustrationKind(65)).toBe('heavy-rain')
    expect(mapWeatherCodeToIllustrationKind(82)).toBe('heavy-rain')
  })

  it('maps snow and snow showers to snow', () => {
    expect(mapWeatherCodeToIllustrationKind(71)).toBe('snow')
    expect(mapWeatherCodeToIllustrationKind(75)).toBe('snow')
    expect(mapWeatherCodeToIllustrationKind(85)).toBe('snow')
  })

  it('maps thunderstorm codes to thunderstorm', () => {
    expect(mapWeatherCodeToIllustrationKind(95)).toBe('thunderstorm')
    expect(mapWeatherCodeToIllustrationKind(99)).toBe('thunderstorm')
  })

  it('falls back to cloudy for an unrecognized code', () => {
    expect(mapWeatherCodeToIllustrationKind(9999)).toBe('cloudy')
  })

  it('falls back to cloudy when no code is available', () => {
    expect(mapWeatherCodeToIllustrationKind(undefined)).toBe('cloudy')
  })
})
