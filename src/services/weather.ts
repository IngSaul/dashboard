import type { WeatherPreference, WeatherSummary } from '../types/dashboard'

/**
 * Outcome of a weather fetch attempt, decoupled from how the fetch itself
 * happens so the mapping to a `WeatherSummary` stays pure and unit-testable.
 */
export type WeatherErrorReason = 'permission-denied' | 'unavailable'

export type WeatherFetchOutcome =
  | { kind: 'success'; temperature: number; condition: string; weatherCode: number; observedAt: string }
  | { kind: 'error'; reason?: WeatherErrorReason }

const DISABLED_MESSAGE = 'El clima está desactivado.'
const SETUP_NEEDED_MESSAGE = 'Configura una ubicación para ver el clima.'
const UNAVAILABLE_MESSAGE = 'El clima no está disponible en este momento.'
const PERMISSION_DENIED_MESSAGE =
  'El acceso a la ubicación está bloqueado. Actívalo en la configuración de tu navegador para ver el clima.'

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
    const message = outcome.reason === 'permission-denied' ? PERMISSION_DENIED_MESSAGE : UNAVAILABLE_MESSAGE
    return { status: 'unavailable', message, ...locationLabel }
  }

  return {
    status: 'available',
    ...locationLabel,
    temperature: outcome.temperature,
    condition: outcome.condition,
    weatherCode: outcome.weatherCode,
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
  0: 'Cielo despejado',
  1: 'Mayormente despejado',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Niebla',
  48: 'Niebla',
  51: 'Llovizna ligera',
  53: 'Llovizna',
  55: 'Llovizna intensa',
  61: 'Lluvia ligera',
  63: 'Lluvia',
  65: 'Lluvia intensa',
  71: 'Nieve ligera',
  73: 'Nieve',
  75: 'Nieve intensa',
  80: 'Chubascos',
  81: 'Chubascos',
  82: 'Chubascos violentos',
  95: 'Tormenta eléctrica',
}

function describeWeatherCode(code: number): string {
  return WEATHER_CODE_DESCRIPTIONS[code] ?? 'Condiciones desconocidas'
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
  })
}

/** Standard `GeolocationPositionError.PERMISSION_DENIED` code (Geolocation API spec) — hardcoded rather than read off the global constructor, which jsdom/test environments don't provide. */
const GEOLOCATION_PERMISSION_DENIED_CODE = 1

function isPositionErrorLike(error: unknown): error is { code: number } {
  return typeof error === 'object' && error !== null && typeof (error as { code?: unknown }).code === 'number'
}

function resolveGeolocationErrorReason(error: unknown): WeatherErrorReason {
  return isPositionErrorLike(error) && error.code === GEOLOCATION_PERMISSION_DENIED_CODE
    ? 'permission-denied'
    : 'unavailable'
}

interface IpLocationResponse {
  success?: boolean
  latitude?: number
  longitude?: number
}

/**
 * Best-effort IP-based location lookup, used as a fallback when browser
 * geolocation is denied/unavailable so the widget can still show real
 * weather instead of giving up. No API key, no permission prompt; never
 * throws — resolves to `null` on any failure.
 */
async function fetchIpLocation(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const response = await fetch('https://ipwho.is/')
    if (!response.ok) {
      return null
    }
    const data = (await response.json()) as IpLocationResponse
    if (data.success === false || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
      return null
    }
    return { latitude: data.latitude, longitude: data.longitude }
  } catch {
    return null
  }
}

async function fetchOpenMeteoCurrentWeather(
  latitude: number,
  longitude: number,
): Promise<WeatherFetchOutcome> {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`,
    )
    if (!response.ok) {
      return { kind: 'error' }
    }
    const data = (await response.json()) as OpenMeteoResponse
    const current = data.current_weather
    if (!current) {
      return { kind: 'error' }
    }
    return {
      kind: 'success',
      temperature: current.temperature,
      condition: describeWeatherCode(current.weathercode),
      weatherCode: current.weathercode,
      observedAt: current.time,
    }
  } catch {
    return { kind: 'error' }
  }
}

/**
 * Fetches the current weather summary. Non-blocking and never throws: any
 * missing capability (no geolocation, denied permission, network failure)
 * resolves to an `unavailable`/`disabled` summary instead of rejecting.
 *
 * `configuredLocation` mode only stores a display label
 * (`WeatherPreference.locationLabel`), not coordinates, so live lookup for
 * it would need a geocoding step that is out of scope here; it resolves to
 * `unavailable` rather than fabricating data. `browserLocation` mode tries
 * the Geolocation API first, then falls back to IP-based location
 * (`fetchIpLocation`) if that's denied/unavailable, so a blocked permission
 * doesn't leave the widget with nothing to show.
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
    return resolveWeatherSummary(preference, { kind: 'error', reason: 'unavailable' })
  }

  try {
    const position = await getCurrentPosition()
    return resolveWeatherSummary(
      preference,
      await fetchOpenMeteoCurrentWeather(position.coords.latitude, position.coords.longitude),
    )
  } catch (error) {
    const reason = resolveGeolocationErrorReason(error)
    const ipLocation = await fetchIpLocation()
    if (!ipLocation) {
      return resolveWeatherSummary(preference, { kind: 'error', reason })
    }
    const outcome = await fetchOpenMeteoCurrentWeather(ipLocation.latitude, ipLocation.longitude)
    return resolveWeatherSummary(preference, outcome.kind === 'success' ? outcome : { kind: 'error', reason })
  }
}
