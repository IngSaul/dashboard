import { useId, type ComponentPropsWithoutRef } from 'react'
import './GlassInput.css'

export interface GlassInputProps extends ComponentPropsWithoutRef<'input'> {
  /** Visible label text. Required so every glass input has an accessible name (no icon-only inputs). */
  label: string
  /** Hides the label visually while keeping it in the accessibility tree (e.g. the search pill's leading icon already communicates purpose). */
  hideLabel?: boolean
}

/**
 * Glass-material text input (e.g. the search pill, a shortcut URL field in
 * `SettingsDrawer`). Always paired with a `<label>` — `hideLabel` visually
 * hides it without removing it for assistive technology.
 */
export function GlassInput({ label, hideLabel = false, id, className = '', ...rest }: GlassInputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <div className="glass-input-group">
      <label htmlFor={inputId} className={hideLabel ? 'sr-only' : 'glass-input-group__label'}>
        {label}
      </label>
      <input id={inputId} className={`glass-input ${className}`.trim()} {...rest} />
    </div>
  )
}
