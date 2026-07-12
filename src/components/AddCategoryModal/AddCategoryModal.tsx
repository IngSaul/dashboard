import { useState, type FormEvent } from 'react'
import { GlassDialog } from '../glass/GlassDialog/GlassDialog'
import { GlassInput } from '../glass/GlassInput/GlassInput'
import { GlassButton } from '../glass/GlassButton/GlassButton'
import type { CategoryInput, CategoryMutationResult } from '../../services/categories'
import './AddCategoryModal.css'

export interface AddCategoryModalProps {
  open: boolean
  onClose: () => void
  onCreate: (input: CategoryInput) => CategoryMutationResult
}

/**
 * Modal create surface for a brand-new category, opened from `CategoryNav`'s
 * trailing `AddCategoryCard`. Built on the same `GlassDialog` + `GlassInput`
 * combination `EditCategoryModal` uses, but with a single "Crear categoría"
 * action and no explicit cancel button — `GlassDialog`'s backdrop-click/
 * Escape close is the only way out, per this feature's UX spec. A single
 * long-lived instance (like `AddShortcutModal`, not remounted per-target),
 * so every path that closes it explicitly resets its own field state.
 */
export function AddCategoryModal({ open, onClose, onCreate }: AddCategoryModalProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setName('')
    setError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = onCreate({ name })
    if (result.ok) {
      reset()
      onClose()
    } else {
      setError(result.error)
    }
  }

  return (
    <GlassDialog open={open} onClose={handleClose} title="Añadir categoría">
      <form className="add-category-modal" onSubmit={handleSubmit}>
        <GlassInput label="Nombre" value={name} onChange={(event) => setName(event.target.value)} />
        {error ? (
          <p className="add-category-modal__error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="add-category-modal__actions">
          <GlassButton type="submit">Crear categoría</GlassButton>
        </div>
      </form>
    </GlassDialog>
  )
}
