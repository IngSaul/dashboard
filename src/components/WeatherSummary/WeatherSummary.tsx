import { StatusMessage, type StatusMessageTone } from '../StatusMessage/StatusMessage'
<<<<<<< Updated upstream
import type { WeatherSummary as WeatherSummaryData } from '../../types/dashboard'
=======
import { WeatherIllustration } from '../weather/WeatherIllustration'
import { formatHourLabel } from '../../utils/dateTime'
import type { HourlyForecastEntry, WeatherSummary as WeatherSummaryData } from '../../types/dashboard'
import './WeatherSummary.css'
>>>>>>> Stashed changes

export interface WeatherSummaryProps {
  summary: WeatherSummaryData
}

/**
 * Renders the weather summary through `StatusMessage` for every state
 * (loading/available/unavailable/disabled), so it always exposes a single
 * identifiable `role="status"` region regardless of state (UI contract's
 * accessibility and weather sections).
 */
export function WeatherSummary({ summary }: WeatherSummaryProps) {
  const tone: StatusMessageTone = summary.status === 'available' ? 'info' : 'notice'
<<<<<<< Updated upstream
  return <StatusMessage message={buildWeatherMessage(summary)} tone={tone} />
=======
  const message = <StatusMessage message={buildWeatherMessage(summary)} tone={tone} />

  if (summary.status !== 'available') {
    return message
  }

  const range = buildWeatherRangeMessage(summary)

  return (
    <div className="weather-summary">
      <div className="weather-summary__main">
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

function HourlyForecast({ entries }: { entries: HourlyForecastEntry[] }) {
  return (
    <div className="weather-summary__forecast">
      <p className="weather-summary__forecast-title">Pronóstico del tiempo para hoy</p>
      <ul className="weather-summary__forecast-list">
        {entries.map((entry) => (
          <li key={entry.time} className="weather-summary__forecast-item">
            <span className="weather-summary__forecast-temperature">{Math.round(entry.temperature)}°</span>
            <WeatherIllustration code={entry.weatherCode} className="weather-summary__forecast-icon" />
            <span className="weather-summary__forecast-hour">{formatHourLabel(new Date(entry.time))}</span>
          </li>
        ))}
      </ul>
    </div>
  )
>>>>>>> Stashed changes
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
