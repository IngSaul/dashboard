import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchWeatherSummary, resolveWeatherSummary } from '../../src/services/weather'
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

  it('carries hourly forecast entries through to the summary when present', () => {
    const result = resolveWeatherSummary(configuredPreference, {
      kind: 'success',
      temperature: 21,
      condition: 'Clear',
      weatherCode: 0,
      observedAt: '2026-07-08T09:00:00.000Z',
      hourlyForecast: [{ time: '2026-07-08T10:00:00.000Z', temperature: 22, weatherCode: 1 }],
    })

    expect(result.hourlyForecast).toEqual([
      { time: '2026-07-08T10:00:00.000Z', temperature: 22, weatherCode: 1 },
    ])
  })

  it('omits hourly forecast from the summary when the outcome has none', () => {
    const result = resolveWeatherSummary(configuredPreference, {
      kind: 'success',
      temperature: 21,
      condition: 'Clear',
      weatherCode: 0,
      observedAt: '2026-07-08T09:00:00.000Z',
    })

    expect(result.hourlyForecast).toBeUndefined()
  })

  it('returns a calm unavailable summary on fetch failure, not a thrown error', () => {
    const result = resolveWeatherSummary(configuredPreference, { kind: 'error' })

    expect(result.status).toBe('unavailable')
    expect(result.message).toBeTruthy()
  })

  it('returns a permission-specific message when geolocation access was denied', () => {
    const generic = resolveWeatherSummary(configuredPreference, { kind: 'error', reason: 'unavailable' })
    const permissionDenied = resolveWeatherSummary(configuredPreference, {
      kind: 'error',
      reason: 'permission-denied',
    })

    expect(permissionDenied.status).toBe('unavailable')
    expect(permissionDenied.message).not.toBe(generic.message)
    expect(permissionDenied.message).toMatch(/ubicaci[oó]n/i)
  })
})

describe('fetchWeatherSummary', () => {
  const browserLocationPreference: WeatherPreference = {
    mode: 'browserLocation',
    units: 'metric',
    enabled: true,
  }

  const openMeteoResponse = {
    current_weather: { temperature: 21, weathercode: 0, time: '2026-07-10T12:00:00.000Z' },
<<<<<<< Updated upstream
=======
    daily: { temperature_2m_max: [24], temperature_2m_min: [12] },
    hourly: {
      time: [
        '2026-07-10T11:00:00.000Z',
        '2026-07-10T13:00:00.000Z',
        '2026-07-10T14:00:00.000Z',
        '2026-07-11T00:00:00.000Z',
      ],
      temperature_2m: [20, 22, 23, 15],
      weathercode: [0, 1, 2, 3],
    },
>>>>>>> Stashed changes
  }

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('falls back to IP-based location and still returns real weather when the browser denies geolocation', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (
          _success: PositionCallback,
          error?: PositionErrorCallback,
        ) => error?.({ code: 1, message: 'denied' } as GeolocationPositionError),
      },
    })
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('ipwho.is')) {
        return new Response(JSON.stringify({ success: true, latitude: 1, longitude: 2 }), { status: 200 })
      }
      return new Response(JSON.stringify(openMeteoResponse), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchWeatherSummary(browserLocationPreference)

    expect(result.status).toBe('available')
    expect(result.temperature).toBe(21)
<<<<<<< Updated upstream
=======
    expect(result.temperatureMax).toBe(24)
    expect(result.temperatureMin).toBe(12)
    expect(result.weatherCode).toBe(0)
    expect(result.hourlyForecast).toEqual([
      { time: '2026-07-10T13:00:00.000Z', temperature: 22, weatherCode: 1 },
      { time: '2026-07-10T14:00:00.000Z', temperature: 23, weatherCode: 2 },
    ])
  })

  it('omits hourly forecast entries once the current day has no data left', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (success: PositionCallback) =>
          success({ coords: { latitude: 1, longitude: 2 } } as GeolocationPosition),
      },
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              current_weather: { temperature: 15, weathercode: 3, time: '2026-07-10T23:00:00.000Z' },
              daily: { temperature_2m_max: [24], temperature_2m_min: [12] },
              hourly: {
                time: ['2026-07-11T00:00:00.000Z'],
                temperature_2m: [14],
                weathercode: [3],
              },
            }),
            { status: 200 },
          ),
      ),
    )

    const result = await fetchWeatherSummary(browserLocationPreference)

    expect(result.status).toBe('available')
    expect(result.hourlyForecast).toBeUndefined()
>>>>>>> Stashed changes
  })

  it('reports a permission-denied reason when both geolocation and the IP fallback fail', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (
          _success: PositionCallback,
          error?: PositionErrorCallback,
        ) => error?.({ code: 1, message: 'denied' } as GeolocationPositionError),
      },
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 500 })),
    )

    const result = await fetchWeatherSummary(browserLocationPreference)

    expect(result.status).toBe('unavailable')
    expect(result.message).toMatch(/ubicaci[oó]n/i)
  })
})
