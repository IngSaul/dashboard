/**
 * Breakpoint tokens.
 *
 * Plain pixel thresholds consumed by `layoutEngine`'s `useBreakpoint()` hook
 * (JS `matchMedia`, not CSS custom properties — custom properties cannot be
 * used inside a `@media` condition). These mirror the `max-width: 1024px`
 * and `max-width: 720px` breakpoints already hand-authored in
 * `src/index.css`, so JS-resolved and CSS-resolved layout changes happen at
 * the same viewport widths.
 *
 * `desktop` has no explicit max-width — it is "wider than `tabletMax`".
 */

export const BREAKPOINTS = {
  tabletMax: 1024,
  phoneMax: 720,
} as const

export const BREAKPOINT_QUERIES = {
  tablet: `(max-width: ${BREAKPOINTS.tabletMax}px)`,
  phone: `(max-width: ${BREAKPOINTS.phoneMax}px)`,
} as const
