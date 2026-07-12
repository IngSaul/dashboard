import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import './GlassIconButton.css'

export interface GlassIconButtonProps extends Omit<ComponentPropsWithoutRef<'button'>, 'aria-label'> {
  /** Required: an icon-only control has no visible text, so it needs an accessible name. */
  'aria-label': string
  children: ReactNode
}

/**
 * Circular glass-material button for a single icon (e.g. the floating
 * edit/settings entry point, a widget's overflow menu trigger). Forwards
 * its ref so callers that open a popup from it (e.g. `ShortcutActionsMenu`)
 * can return focus to the trigger on close.
 */
export const GlassIconButton = forwardRef<HTMLButtonElement, GlassIconButtonProps>(function GlassIconButton(
  { type = 'button', className = '', children, ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={`glass-icon-button ${className}`.trim()} {...rest}>
      {children}
    </button>
  )
})
