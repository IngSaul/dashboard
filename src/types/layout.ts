import type { Widget } from './widgets'

/**
 * Layout resolution types (002-widget-dashboard). See
 * `specs/002-widget-dashboard/data-model.md#breakpoint--resolvedlayout`.
 */

/**
 * The active viewport class, as determined by `layoutEngine.useBreakpoint()`
 * against the thresholds in `src/design/breakpoints.ts`. `'phone'` is
 * best-effort per the project's Responsive principle.
 */
export type Breakpoint = 'desktop' | 'tablet' | 'phone'

/**
 * The per-column, ordered, enabled-only widget list `Workspace` actually
 * renders for the current `Breakpoint`. Not persisted — always derivable
 * from a `WidgetLayout` plus registered widget metadata plus the current
 * `Breakpoint`, recomputed by `layoutEngine.resolveLayout()`.
 */
export interface ResolvedLayout {
  left: Widget[]
  center: Widget[]
  right: Widget[]
}
