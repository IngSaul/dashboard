import type { ReactNode } from 'react'
import { GlassPanel, type GlassPanelProps } from '../GlassPanel/GlassPanel'
import './GlassCard.css'

export interface GlassCardProps extends GlassPanelProps {
  /** Lifts the card with a soft shadow on hover/focus-within (e.g. a widget the user can interact with). */
  interactive?: boolean
  children?: ReactNode
}

/**
 * Padded `GlassPanel` variant used as the outer frame for every widget
 * (per the UI contract's "every widget surface MUST be wrapped in the
 * shared glass primitive" rule) and other content-bearing glass surfaces.
 */
export function GlassCard({ interactive = false, className = '', children, ...rest }: GlassCardProps) {
  const interactiveClass = interactive ? 'glass-card--interactive' : ''
  return (
    <GlassPanel className={`glass-card ${interactiveClass} ${className}`.trim()} {...rest}>
      {children}
    </GlassPanel>
  )
}
