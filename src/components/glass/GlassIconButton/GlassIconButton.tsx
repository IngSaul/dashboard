import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import './GlassIconButton.css'

export interface GlassIconButtonProps extends Omit<ComponentPropsWithoutRef<'button'>, 'aria-label'> {
  /** Required: an icon-only control has no visible text, so it needs an accessible name. */
  'aria-label': string
  children: ReactNode
}

/**
 * Circular glass-material button for a single icon (e.g. the floating
 * edit/settings entry point, a widget's overflow menu trigger).
 */
export function GlassIconButton({ type = 'button', className = '', children, ...rest }: GlassIconButtonProps) {
  return (
    <button type={type} className={`glass-icon-button ${className}`.trim()} {...rest}>
      {children}
    </button>
  )
}
