import { useId, type ComponentPropsWithoutRef } from 'react'
import './GlassTextarea.css'

export interface GlassTextareaProps extends ComponentPropsWithoutRef<'textarea'> {
  /** Visible label text. Required so every glass textarea has an accessible name (mirrors `GlassInput`). */
  label: string
  /** Hides the label visually while keeping it in the accessibility tree. */
  hideLabel?: boolean
}

/**
 * Glass-material multi-line text input (e.g. the notes widget's editor).
 * Mirrors `GlassInput`'s label/`hideLabel` shape and material styling — the
 * only difference is the underlying element, since a note's content is
 * multi-line where a search/URL field is not.
 */
export function GlassTextarea({
  label,
  hideLabel = false,
  id,
  className = '',
  ...rest
}: GlassTextareaProps) {
  const generatedId = useId()
  const textareaId = id ?? generatedId

  return (
    <div className="glass-input-group">
      <label htmlFor={textareaId} className={hideLabel ? 'sr-only' : 'glass-input-group__label'}>
        {label}
      </label>
      <textarea id={textareaId} className={`glass-textarea ${className}`.trim()} {...rest} />
    </div>
  )
}
