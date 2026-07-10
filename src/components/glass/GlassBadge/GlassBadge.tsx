import type { ReactNode } from 'react'
import './GlassBadge.css'

export type GlassBadgeTone = 'neutral' | 'success' | 'warning' | 'danger'

export interface GlassBadgeProps {
  tone?: GlassBadgeTone
  children: ReactNode
}

/**
 * Small status/count indicator on a glass surface (e.g. a widget's
 * "not-configured" marker, a category's shortcut count).
 */
export function GlassBadge({ tone = 'neutral', children }: GlassBadgeProps) {
  return <span className={`glass-badge glass-badge--${tone}`}>{children}</span>
}
