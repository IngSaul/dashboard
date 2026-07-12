import { useState } from 'react'
import { GlassDialog } from '../glass/GlassDialog/GlassDialog'
import { ShortcutPreview } from '../ShortcutPreview/ShortcutPreview'
import { ShortcutForm, NO_CATEGORY_VALUE } from '../ShortcutForm/ShortcutForm'
import type { ShortcutInput, ShortcutMutationResult } from '../../services/shortcuts'
import type { ShortcutCategory } from '../../types/dashboard'
import './AddShortcutModal.css'

export interface AddShortcutModalProps {
  open: boolean
  categories: ShortcutCategory[]
  onClose: () => void
  onCreate: (input: ShortcutInput) => ShortcutMutationResult
}

/**
 * Modal create surface for a brand-new shortcut, opened from the grid's
 * trailing `AddShortcutCard`. Built on the same `GlassDialog` +
 * `ShortcutPreview`/`ShortcutForm` combination `EditShortcutModal` uses,
 * but kept as its own component rather than reusing `EditShortcutModal`
 * directly: there's no existing `Shortcut` to seed field state from or
 * hand to `ShortcutPreview`'s icon override, and "Crear"/"Cancelar" is a
 * different action pair than "Guardar"/"Cancelar". Unlike
 * `EditShortcutModal` (remounted per-target via `key={shortcut?.id}`),
 * this is a single long-lived instance, so every path that closes it
 * (submit success, Cancelar, backdrop/Escape) explicitly resets its own
 * field state — otherwise stale input would reappear next time it opens.
 */
export function AddShortcutModal({ open, categories, onClose, onCreate }: AddShortcutModalProps) {
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [categoryId, setCategoryId] = useState(NO_CATEGORY_VALUE)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setLabel('')
    setUrl('')
    setCategoryId(NO_CATEGORY_VALUE)
    setError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSubmit() {
    const input: ShortcutInput = {
      label,
      url,
      ...(categoryId ? { categoryId } : {}),
    }
    const result = onCreate(input)
    if (result.ok) {
      reset()
      onClose()
    } else {
      setError(result.error)
    }
  }

  return (
    <GlassDialog open={open} onClose={handleClose} title="Añadir acceso directo">
      <div className="add-shortcut-modal">
        <ShortcutPreview label={label} url={url} />
        <ShortcutForm
          label={label}
          url={url}
          categoryId={categoryId}
          categories={categories}
          error={error}
          onLabelChange={setLabel}
          onUrlChange={setUrl}
          onCategoryChange={setCategoryId}
          onSubmit={handleSubmit}
          onCancel={handleClose}
          submitLabel="Crear"
        />
      </div>
    </GlassDialog>
  )
}
