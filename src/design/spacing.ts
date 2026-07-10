/**
 * Spacing tokens.
 *
 * Semantic aliases over the existing `--space-1`..`--space-8` custom
 * properties defined in `src/index.css` — no new CSS values are introduced
 * here, this just gives the design system a stable, semantic API instead of
 * numbered steps.
 */

export const spacingTokens = {
  none: '0',
  xs: 'var(--space-1)',
  sm: 'var(--space-2)',
  md: 'var(--space-4)',
  lg: 'var(--space-5)',
  xl: 'var(--space-6)',
  '2xl': 'var(--space-7)',
  '3xl': 'var(--space-8)',
} as const

export type SpacingToken = keyof typeof spacingTokens
