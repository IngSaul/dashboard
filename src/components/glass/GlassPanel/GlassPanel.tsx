import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'
import './GlassPanel.css'

export interface GlassPanelProps extends ComponentPropsWithoutRef<'div'> {
  /** Renders as a different element (e.g. `section`, `article`) while keeping the same glass material. */
  as?: ElementType
  children?: ReactNode
}

/**
 * The base glass material every other `Glass*` component and every widget
 * surface is built on. Reads exclusively from `src/design/glass.ts` tokens
 * (via CSS custom properties) so no consumer defines its own blur/
 * translucency/border values inline, per the UI contract's "one material"
 * rule.
 */
export function GlassPanel({ as: Component = 'div', className = '', children, ...rest }: GlassPanelProps) {
  return (
    <Component className={`glass-panel ${className}`.trim()} {...rest}>
      {children}
    </Component>
  )
}
