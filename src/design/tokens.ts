/**
 * Aggregated design token export.
 *
 * Single import point for consumers (primarily the `Glass*` component
 * family in `src/components/glass/`) that need more than one token
 * category. Individual categories can still be imported directly from
 * their own module when only one is needed.
 */

export { spacingTokens, type SpacingToken } from './spacing'
export { radiusTokens, type RadiusToken } from './radius'
export { colorTokens, type ColorToken } from './colors'
export {
  motionDurationTokens,
  motionDurationMs,
  motionEasingTokens,
  type MotionDurationToken,
  type MotionEasingToken,
} from './motion'
export {
  glassBlurTokens,
  glassFillTokens,
  glassBorderTokens,
  DEFAULT_GLASS_INTENSITY,
  DEFAULT_GLASS_BORDER_STRENGTH,
  type GlassIntensity,
  type GlassBorderStrength,
} from './glass'
export { BREAKPOINTS, BREAKPOINT_QUERIES } from './breakpoints'
export {
  fontFamilyTokens,
  fontSizeTokens,
  fontWeightTokens,
  type FontSizeToken,
  type FontWeightToken,
} from './typography'
export { shadowTokens, type ShadowToken } from './shadows'
export { zIndexTokens, zIndexValues, type ZIndexToken } from './zIndex'

import { spacingTokens } from './spacing'
import { radiusTokens } from './radius'
import { colorTokens } from './colors'
import { motionDurationTokens, motionEasingTokens } from './motion'
import { glassBlurTokens, glassFillTokens, glassBorderTokens } from './glass'
import { fontFamilyTokens, fontSizeTokens, fontWeightTokens } from './typography'
import { shadowTokens } from './shadows'
import { zIndexTokens } from './zIndex'

export const tokens = {
  spacing: spacingTokens,
  radius: radiusTokens,
  color: colorTokens,
  motion: {
    duration: motionDurationTokens,
    easing: motionEasingTokens,
  },
  glass: {
    blur: glassBlurTokens,
    fill: glassFillTokens,
    border: glassBorderTokens,
  },
  typography: {
    family: fontFamilyTokens,
    size: fontSizeTokens,
    weight: fontWeightTokens,
  },
  shadow: shadowTokens,
  zIndex: zIndexTokens,
} as const
