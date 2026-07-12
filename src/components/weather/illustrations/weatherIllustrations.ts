import type { ComponentType, SVGProps } from 'react'
import type { WeatherIllustrationKind } from '../../../services/weatherIllustrationMap'
import { SunnyIllustration } from './SunnyIllustration'
import { PartlyCloudyIllustration } from './PartlyCloudyIllustration'
import { CloudyIllustration } from './CloudyIllustration'
import { LightRainIllustration } from './LightRainIllustration'
import { HeavyRainIllustration } from './HeavyRainIllustration'
import { ThunderstormIllustration } from './ThunderstormIllustration'
import { SnowIllustration } from './SnowIllustration'
import { FogIllustration } from './FogIllustration'
import { WindIllustration } from './WindIllustration'

/** `WeatherIllustrationKind` -> the SVG component that renders it. The single place `WeatherIllustration` looks up which illustration to show. */
export const weatherIllustrations: Record<WeatherIllustrationKind, ComponentType<SVGProps<SVGSVGElement>>> = {
  sunny: SunnyIllustration,
  'partly-cloudy': PartlyCloudyIllustration,
  cloudy: CloudyIllustration,
  'light-rain': LightRainIllustration,
  'heavy-rain': HeavyRainIllustration,
  thunderstorm: ThunderstormIllustration,
  snow: SnowIllustration,
  fog: FogIllustration,
  wind: WindIllustration,
}
