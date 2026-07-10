/**
 * Typography tokens.
 *
 * Font families reuse the existing `--font-sans`/`--font-mono` custom
 * properties from `src/index.css`. The size/weight scale adds the tokens
 * needed for the dashboard's dominant clock display and dense widget text,
 * per design-reference.md's typography observations.
 */

export const fontFamilyTokens = {
  sans: 'var(--font-sans)',
  mono: 'var(--font-mono)',
} as const

export const fontSizeTokens = {
  display: 'var(--font-size-display)',
  title: 'var(--font-size-title)',
  body: 'var(--font-size-body)',
  caption: 'var(--font-size-caption)',
} as const

export const fontWeightTokens = {
  regular: 'var(--font-weight-regular)',
  medium: 'var(--font-weight-medium)',
  semibold: 'var(--font-weight-semibold)',
} as const

export type FontSizeToken = keyof typeof fontSizeTokens
export type FontWeightToken = keyof typeof fontWeightTokens
