import { describe, expect, it } from 'vitest'
import { resolveWeatherSummary } from '../../src/services/weather'
import type { WeatherPreference } from '../../src/types/dashboard'

/**
 * `weather.ts` does not exist yet (built in T027); these tests define the
 * contract for its pure state-mapping function and are expected to fail to
 * resolve until then. `resolveWeatherSummary` maps a preference plus a fetch
 * outcome to a `WeatherSummary`; the actual network/geolocation call is a
 * thin, harder-to-unit-test orchestrator built around it.
 */

const configuredPreference: WeatherPreference = {
  mode: 'configuredLocation',
  locationLabel: 'Example City',
  units: 'metric',
  enabled: true,
}

describe('resolveWeatherSummary', () => {
  it('returns a disabled summary when weather is turned off', () => {
    const result = resolveWeatherSummary({ ...configuredPreference, enabled: false }, 'loading')

    expect(result.status).toBe('disabled')
  })

  it('returns an unavailable summary when no location is configured', () => {
    const preference: WeatherPreference = {
      mode: 'configuredLocation',
      units: 'metric',
      enabled: true,
    }

    const result = resolveWeatherSummary(preference, 'loading')

    expect(result.status).toBe('unavailable')
  })

  it('returns a loading summary while the request is in flight', () => {
    const result = resolveWeatherSummary(configuredPreference, 'loading')

    expect(result.status).toBe('loading')
    expect(result.locationLabel).toBe('Example City')
  })

  it('returns an available summary with conditions on a successful fetch', () => {
    const result = resolveWeatherSummary(configuredPreference, {
      kind: 'success',
      temperature: 21,
      condition: 'Clear',
      observedAt: '2026-07-08T09:00:00.000Z',
    })

    expect(result).toEqual({
      status: 'available',
      locationLabel: 'Example City',
      temperature: 21,
      condition: 'Clear',
      observedAt: '2026-07-08T09:00:00.000Z',
    })
  })

  it('returns a calm unavailable summary on fetch failure, not a thrown error', () => {
    const result = resolveWeatherSummary(configuredPreference, { kind: 'error' })

    expect(result.status).toBe('unavailable')
    expect(result.message).toBeTruthy()
  })
})
