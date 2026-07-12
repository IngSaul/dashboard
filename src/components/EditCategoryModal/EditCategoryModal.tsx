import { useState, type FormEvent } from 'react'
import { GlassDialog } from '../glass/GlassDialog/GlassDialog'
import { GlassInput } from '../glass/GlassInput/GlassInput'
import { GlassButton } from '../glass/GlassButton/GlassButton'
import type { CategoryInput, CategoryMutationResult } from '../../services/categories'
import type { ShortcutCategory } from '../../types/dashboard'
import './EditCategoryModal.css'

export interface EditCategoryModalProps {
  open: boolean
  category: ShortcutCategory | null
  onClose: () => void
  onSave: (id: string, input: CategoryInput) => CategoryMutationResult
}

/**
 * Modal rename surface for a single category, built on `GlassDialog` the
 * same way `EditShortcutModal` is. The parent (`ShortcutsWidget`) remounts
 * this with `key={category?.id}` whenever a different category starts
 * editing, so the name field always starts fresh.
 */
export function EditCategoryModal({ open, category, onClose, onSave }: EditCategoryModalProps) {
  const [name, setName] = useState(category?.name ?? '')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!category) {
      return
    }
    const result = onSave(category.id, { name })
    if (result.ok) {
      setError(null)
      onClose()
    } else {
      setError(result.error)
    }
  }

  return (
    <GlassDialog open={open && category !== null} onClose={onClose} title="Editar categoría">
      {category ? (
        <form className="edit-category-modal" onSubmit={handleSubmit}>
          <GlassInput label="Nombre" value={name} onChange={(event) => setName(event.target.value)} />
          {error ? (
            <p className="edit-category-modal__error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="edit-category-modal__actions">
            <GlassButton type="submit">Guardar</GlassButton>
            <GlassButton type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </GlassButton>
          </div>
        </form>
      ) : null}
    </GlassDialog>
  )
}
