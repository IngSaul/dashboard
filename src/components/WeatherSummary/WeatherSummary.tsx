import { StatusMessage, type StatusMessageTone } from '../StatusMessage/StatusMessage'
import type { WeatherSummary as WeatherSummaryData } from '../../types/dashboard'

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
  return <StatusMessage message={buildWeatherMessage(summary)} tone={tone} />
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
      return 'Loading weather…'
    case 'disabled':
      return summary.message ?? 'Weather is turned off.'
    case 'unavailable':
      return summary.message ?? 'Weather is unavailable right now.'
  }
}
