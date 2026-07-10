/**
 * Motion tokens.
 *
 * Durations/easings for functional transitions (widget add/remove/reorder,
 * hover/focus, drawer/palette open-close). `fast` reuses the existing
 * `--transition-fast` custom property; `base`/`slow` are new, larger steps
 * for structural transitions (e.g. `SettingsDrawer` slide-in).
 *
 * All duration values are also exposed as plain millisecond numbers for
 * JS-driven timing (e.g. `setTimeout`-based sequencing), since CSS custom
 * properties can't be read as numbers without a `getComputedStyle` round
 * trip. The global `prefers-reduced-motion: reduce` block in
 * `src/index.css` already forces near-zero durations for every transition,
 * so components can use these tokens unconditionally.
 */

export const motionDurationTokens = {
  fast: 'var(--motion-duration-fast)',
  base: 'var(--motion-duration-base)',
  slow: 'var(--motion-duration-slow)',
} as const

export const motionDurationMs = {
  fast: 160,
  base: 220,
  slow: 320,
} as const

export const motionEasingTokens = {
  standard: 'var(--motion-easing-standard)',
  decelerate: 'var(--motion-easing-decelerate)',
} as const

export type MotionDurationToken = keyof typeof motionDurationTokens
export type MotionEasingToken = keyof typeof motionEasingTokens
