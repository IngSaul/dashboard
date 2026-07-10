/**
 * Corner radius tokens.
 *
 * `sm`/`md`/`lg` reuse the existing `--radius-*` custom properties from
 * `src/index.css`. `xl`/`2xl` are new, larger radii for the glassmorphism
 * material (widgets, dialogs, the search pill) per design-reference.md's
 * "large radius, ~16-20px" observation.
 */

export const radiusTokens = {
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  xl: 'var(--radius-xl)',
  '2xl': 'var(--radius-2xl)',
} as const

export type RadiusToken = keyof typeof radiusTokens
