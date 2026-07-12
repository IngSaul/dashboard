import { StatusMessage, type StatusMessageTone } from '../StatusMessage/StatusMessage'
import { WeatherIllustration } from '../weather/WeatherIllustration'
import { formatDashboardTime } from '../../utils/dateTime'
import type { HourlyForecastEntry, WeatherSummary as WeatherSummaryData } from '../../types/dashboard'
import './WeatherSummary.css'

export interface WeatherSummaryProps {
  summary: WeatherSummaryData
}

/**
 * Renders the weather summary through `StatusMessage` for every state
 * (loading/available/unavailable/disabled), so it always exposes a single
 * identifiable `role="status"` region regardless of state (UI contract's
 * accessibility and weather sections). Only the `available` state also gets
 * a large `WeatherIllustration` alongside it — the other states have no
 * weather code to illustrate.
 */
export function WeatherSummary({ summary }: WeatherSummaryProps) {
  const tone: StatusMessageTone = summary.status === 'available' ? 'info' : 'notice'
  const message = <StatusMessage message={buildWeatherMessage(summary)} tone={tone} />

  if (summary.status !== 'available') {
    return message
  }

  const range = buildWeatherRangeMessage(summary)

  return (
    <div className="weather-summary">
      <div className="weather-summary__top">
        <div className="weather-summary__details">
          {message}
          {range && <p className="weather-summary__range">{range}</p>}
        </div>
        <WeatherIllustration code={summary.weatherCode} className="weather-summary__illustration" />
      </div>
      {summary.hourlyForecast && summary.hourlyForecast.length > 0 && (
        <HourlyForecast entries={summary.hourlyForecast} />
      )}
    </div>
  )
}

interface HourlyForecastProps {
  entries: HourlyForecastEntry[]
}

/** Renders the "today" hourly forecast row (icon + temperature + hour) for each upcoming entry. */
function HourlyForecast({ entries }: HourlyForecastProps) {
  return (
    <div className="weather-summary__hourly">
      <p className="weather-summary__hourly-title">Pronóstico del tiempo para hoy</p>
      <ul className="weather-summary__hourly-list">
        {entries.map((entry) => (
          <li key={entry.time} className="weather-summary__hourly-item">
            <WeatherIllustration code={entry.weatherCode} className="weather-summary__hourly-icon" />
            <span className="weather-summary__hourly-temp">{Math.round(entry.temperature)}°</span>
            <span className="weather-summary__hourly-time">{formatDashboardTime(new Date(entry.time))}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function buildWeatherMessage(summary: WeatherSummaryData): string {
  switch (summary.status) {
    case 'available': {
      const location = summary.locationLabel ? `${summary.locationLabel}: ` : ''
      const temperature =
        summary.temperature !== undefined ? `${Math.round(summary.temperature)}°` : ''
      const condition = summary.condition ?? ''
      return `${location}${temperature} ${condition}`.trim()
    }
    case 'loading':
      return 'Cargando el widget de clima…'
    case 'disabled':
      return summary.message ?? 'El clima está desactivado.'
    case 'unavailable':
      return summary.message ?? 'El clima no está disponible en este momento.'
  }
}

/** Empty when either bound is missing (e.g. `configuredLocation` mode never supplies daily data) so the card doesn't show a broken "↑°" fragment. */
function buildWeatherRangeMessage(summary: WeatherSummaryData): string {
  if (summary.temperatureMax === undefined || summary.temperatureMin === undefined) {
    return ''
  }
  return `↑ ${Math.round(summary.temperatureMax)}° ↓ ${Math.round(summary.temperatureMin)}°`
}
