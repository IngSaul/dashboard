import type { WeatherPreference, WeatherSummary } from '../types/dashboard'

/**
 * Outcome of a weather fetch attempt, decoupled from how the fetch itself
 * happens so the mapping to a `WeatherSummary` stays pure and unit-testable.
 */
export type WeatherFetchOutcome =
  | { kind: 'success'; temperature: number; condition: string; observedAt: string }
  | { kind: 'error' }

const DISABLED_MESSAGE = 'Weather is turned off.'
const SETUP_NEEDED_MESSAGE = 'Set a location to see weather.'
const UNAVAILABLE_MESSAGE = 'Weather is unavailable right now.'

/**
 * Maps a weather preference plus a fetch outcome (or `'loading'`) to the
 * `WeatherSummary` shown on the dashboard. Never throws; failures and
 * missing setup resolve to a calm `unavailable`/`disabled` state rather than
 * blocking the rest of the page (UI contract's weather section).
 */
export function resolveWeatherSummary(
  preference: WeatherPreference,
  outcome: WeatherFetchOutcome | 'loading',
): WeatherSummary {
  if (!preference.enabled) {
    return { status: 'disabled', message: DISABLED_MESSAGE }
  }

  if (preference.mode === 'configuredLocation' && !preference.locationLabel) {
    return { status: 'unavailable', message: SETUP_NEEDED_MESSAGE }
  }

  const locationLabel =
    preference.locationLabel !== undefined ? { locationLabel: preference.locationLabel } : {}

  if (outcome === 'loading') {
    return { status: 'loading', ...locationLabel }
  }

  if (outcome.kind === 'error') {
    return { status: 'unavailable', message: UNAVAILABLE_MESSAGE, ...locationLabel }
  }

  return {
    status: 'available',
    ...locationLabel,
    temperature: outcome.temperature,
    condition: outcome.condition,
    observedAt: outcome.observedAt,
  }
}

interface OpenMeteoCurrentWeather {
  temperature: number
  weathercode: number
  time: string
}

interface OpenMeteoResponse {
  current_weather?: OpenMeteoCurrentWeather
}

/** WMO weather codes (subset) used by Open-Meteo's `current_weather` field. */
const WEATHER_CODE_DESCRIPTIONS: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Dense drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  80: 'Rain showers',
  81: 'Rain showers',
  82: 'Violent rain showers',
  95: 'Thunderstorm',
}

function describeWeatherCode(code: number): string {
  return WEATHER_CODE_DESCRIPTIONS[code] ?? 'Unknown conditions'
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
  })
}

/**
 * Fetches the current weather summary. Non-blocking and never throws: any
 * missing capability (no geolocation, denied permission, network failure)
 * resolves to an `unavailable`/`disabled` summary instead of rejecting.
 *
 * `configuredLocation` mode only stores a display label
 * (`WeatherPreference.locationLabel`), not coordinates, so live lookup for
 * it would need a geocoding step that is out of scope here; it resolves to
 * `unavailable` rather than fabricating data. `browserLocation` mode uses
 * the Geolocation API with the Open-Meteo forecast API (no key required).
 */
export async function fetchWeatherSummary(preference: WeatherPreference): Promise<WeatherSummary> {
  if (!preference.enabled) {
    return resolveWeatherSummary(preference, 'loading')
  }

  if (preference.mode === 'configuredLocation') {
    return resolveWeatherSummary(
      preference,
      preference.locationLabel === undefined ? 'loading' : { kind: 'error' },
    )
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return resolveWeatherSummary(preference, { kind: 'error' })
  }

  try {
    const position = await getCurrentPosition()
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&current_weather=true`,
    )
    if (!response.ok) {
      return resolveWeatherSummary(preference, { kind: 'error' })
    }
    const data = (await response.json()) as OpenMeteoResponse
    const current = data.current_weather
    if (!current) {
      return resolveWeatherSummary(preference, { kind: 'error' })
    }
    return resolveWeatherSummary(preference, {
      kind: 'success',
      temperature: current.temperature,
      condition: describeWeatherCode(current.weathercode),
      observedAt: current.time,
    })
  } catch {
    return resolveWeatherSummary(preference, { kind: 'error' })
  }
}
