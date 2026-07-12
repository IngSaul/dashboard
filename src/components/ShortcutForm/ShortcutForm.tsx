import type { FormEvent } from 'react'
import { GlassInput } from '../glass/GlassInput/GlassInput'
import { GlassDropdown } from '../glass/GlassDropdown/GlassDropdown'
import { GlassButton } from '../glass/GlassButton/GlassButton'
import type { ShortcutCategory } from '../../types/dashboard'
import './ShortcutForm.css'

/** Category field's "no category" option — a real `ShortcutCategory.id` is never an empty string. */
export const NO_CATEGORY_VALUE = ''

export interface ShortcutFormProps {
  label: string
  url: string
  categoryId: string
  categories: ShortcutCategory[]
  error: string | null
  onLabelChange: (value: string) => void
  onUrlChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
  /** Text for the submit button — `EditShortcutModal` keeps "Guardar", `AddShortcutModal` uses "Crear". */
  submitLabel?: string
}

/**
 * Fully controlled name/URL/category fields for editing a single shortcut —
 * no field state or persistence logic of its own. Field values live in
 * `EditShortcutModal` instead, since that state is also what drives
 * `ShortcutPreview`'s live preview as the user types.
 */
export function ShortcutForm({
  label,
  url,
  categoryId,
  categories,
  error,
  onLabelChange,
  onUrlChange,
  onCategoryChange,
  onSubmit,
  onCancel,
  submitLabel = 'Guardar',
}: ShortcutFormProps) {
  const categoryOptions = [
    { value: NO_CATEGORY_VALUE, label: 'Ninguna' },
    ...categories.map((category) => ({ value: category.id, label: category.name })),
  ]

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form className="shortcut-form" onSubmit={handleSubmit}>
      <GlassInput label="Nombre" value={label} onChange={(event) => onLabelChange(event.target.value)} />
      <GlassInput label="URL" value={url} onChange={(event) => onUrlChange(event.target.value)} />
      <GlassDropdown
        label="Categoría"
        options={categoryOptions}
        value={categoryId}
        onChange={onCategoryChange}
      />
      {error ? (
        <p className="shortcut-form__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="shortcut-form__actions">
        <GlassButton type="submit">{submitLabel}</GlassButton>
        <GlassButton type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </GlassButton>
      </div>
    </form>
  )
}
