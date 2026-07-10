/**
 * Shadow / elevation tokens.
 *
 * `level1` reuses the existing `--shadow-soft` custom property (unchanged
 * from feature 001). `level2`/`level3` are new, deeper elevations for glass
 * surfaces that must lift above others — dropdowns and dialogs/tooltips
 * respectively. All three are theme-aware (redefined per light/dark in
 * `src/index.css`, same pattern as `--shadow-soft`).
 */

export const shadowTokens = {
  level1: 'var(--shadow-elevation-1)',
  level2: 'var(--shadow-elevation-2)',
  level3: 'var(--shadow-elevation-3)',
} as const

export type ShadowToken = keyof typeof shadowTokens
