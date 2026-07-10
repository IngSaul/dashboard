import type { ComponentPropsWithoutRef } from 'react'
import './GlassButton.css'

export type GlassButtonVariant = 'solid' | 'ghost'

export interface GlassButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: GlassButtonVariant
}

/**
 * Glass-material button used for pill/quick-action controls (e.g. the
 * "Manage shortcuts" pill, command results). `type="button"` by default so
 * it never accidentally submits a surrounding form.
 */
export function GlassButton({
  variant = 'solid',
  type = 'button',
  className = '',
  ...rest
}: GlassButtonProps) {
  return <button type={type} className={`glass-button glass-button--${variant} ${className}`.trim()} {...rest} />
}
