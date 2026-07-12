/**
 * WMO weather code -> illustration bucket, independent of
 * `WEATHER_CODE_DESCRIPTIONS` in `weather.ts` (that one produces
 * human-readable Spanish text; this one drives which SVG
 * `WeatherIllustration` renders). Kept as its own pure, synchronous
 * function so it's unit-testable without touching the widget/component tree.
 *
 * `'wind'` has no dedicated WMO sky-condition code — Open-Meteo's
 * `current_weather` doesn't surface wind as a condition, only as a separate
 * speed field this codebase doesn't currently fetch — so it's part of the
 * reusable illustration set but unreachable from `mapWeatherCodeToIllustrationKind`
 * today.
 */

export type WeatherIllustrationKind =
  | 'sunny'
  | 'partly-cloudy'
  | 'cloudy'
  | 'light-rain'
  | 'heavy-rain'
  | 'thunderstorm'
  | 'snow'
  | 'fog'
  | 'wind'

/** Neutral choice for an unrecognized/missing code — a plain cloud, never a bold state like a storm. */
const DEFAULT_ILLUSTRATION_KIND: WeatherIllustrationKind = 'cloudy'

/** WMO weather interpretation codes as used by Open-Meteo's `current_weather.weathercode`. */
const WMO_CODE_TO_ILLUSTRATION_KIND: Record<number, WeatherIllustrationKind> = {
  0: 'sunny',
  1: 'sunny',
  2: 'partly-cloudy',
  3: 'cloudy',
  45: 'fog',
  48: 'fog',
  51: 'light-rain',
  53: 'light-rain',
  55: 'light-rain',
  56: 'light-rain',
  57: 'light-rain',
  61: 'light-rain',
  63: 'heavy-rain',
  65: 'heavy-rain',
  66: 'light-rain',
  67: 'heavy-rain',
  71: 'snow',
  73: 'snow',
  75: 'snow',
  77: 'snow',
  80: 'light-rain',
  81: 'heavy-rain',
  82: 'heavy-rain',
  85: 'snow',
  86: 'snow',
  95: 'thunderstorm',
  96: 'thunderstorm',
  99: 'thunderstorm',
}

/**
 * Maps a raw WMO weather code to an illustration bucket. Never throws:
 * `undefined`/unrecognized codes resolve to the calm `'cloudy'` default
 * rather than guessing, matching this codebase's pattern of degrading
 * gracefully instead of fabricating data.
 */
export function mapWeatherCodeToIllustrationKind(code: number | undefined): WeatherIllustrationKind {
  if (code === undefined) {
    return DEFAULT_ILLUSTRATION_KIND
  }
  return WMO_CODE_TO_ILLUSTRATION_KIND[code] ?? DEFAULT_ILLUSTRATION_KIND
}
