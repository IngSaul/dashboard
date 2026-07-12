import type { SVGProps } from 'react'
import { mapWeatherCodeToIllustrationKind } from '../../services/weatherIllustrationMap'
import { weatherIllustrations } from './illustrations/weatherIllustrations'
import './WeatherIllustration.css'

export interface WeatherIllustrationProps extends SVGProps<SVGSVGElement> {
  /** Raw WMO weather code from `WeatherSummary.weatherCode`; `undefined` renders the neutral cloudy default. */
  code?: number | undefined
}

/**
 * Decorative illustration for the current weather condition — the text
 * summary already carries the accessible description, so this renders
 * `aria-hidden` rather than duplicating it for assistive tech.
 */
export function WeatherIllustration({ code, className, ...svgProps }: WeatherIllustrationProps) {
  const kind = mapWeatherCodeToIllustrationKind(code)
  const Illustration = weatherIllustrations[kind]

  return (
    <Illustration
      className={`weather-illustration ${className ?? ''}`.trim()}
      aria-hidden="true"
      focusable="false"
      {...svgProps}
    />
  )
}
