/**
 * Stacking-order tokens.
 *
 * A single named scale so layering is decided once, here, instead of
 * guessed per component. `background` sits behind normal document flow
 * (`BackgroundLayer`); `base` is default in-flow content (widgets, chrome).
 * `drawer` < `palette` < `dropdown` < `tooltip` < `dialog` reflects that a
 * tooltip/dropdown opened from within `SettingsDrawer` or `CommandPalette`
 * must still render above its host surface, and a `GlassDialog` must render
 * above everything.
 *
 * Exposed both as CSS custom properties (`--z-*` in `src/index.css`, for use
 * directly in component stylesheets) and as plain numbers here (for any
 * programmatic stacking comparison in JS).
 */

export const zIndexTokens = {
  background: 'var(--z-background)',
  base: 'var(--z-base)',
  drawer: 'var(--z-drawer)',
  palette: 'var(--z-palette)',
  dropdown: 'var(--z-dropdown)',
  tooltip: 'var(--z-tooltip)',
  dialog: 'var(--z-dialog)',
} as const

export const zIndexValues = {
  background: 0,
  base: 1,
  drawer: 40,
  palette: 50,
  dropdown: 60,
  tooltip: 70,
  dialog: 80,
} as const

export type ZIndexToken = keyof typeof zIndexTokens
