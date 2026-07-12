import { useState } from 'react'
import { GlassDialog } from '../glass/GlassDialog/GlassDialog'
import { ShortcutPreview } from '../ShortcutPreview/ShortcutPreview'
import { ShortcutForm, NO_CATEGORY_VALUE } from '../ShortcutForm/ShortcutForm'
import type { ShortcutInput, ShortcutMutationResult } from '../../services/shortcuts'
import type { Shortcut, ShortcutCategory } from '../../types/dashboard'
import './EditShortcutModal.css'

export interface EditShortcutModalProps {
  open: boolean
  shortcut: Shortcut | null
  categories: ShortcutCategory[]
  onClose: () => void
  onSave: (id: string, input: ShortcutInput) => ShortcutMutationResult
}

/**
 * Modal edit surface for a single shortcut, built on `GlassDialog` (focus
 * trap, Escape-to-close, and backdrop-click-to-close all come from there).
 * Composes `ShortcutPreview` and the controlled `ShortcutForm` over field
 * state owned here, so the preview updates live as the user types. The
 * parent (`ShortcutsWidget`) remounts this with `key={shortcut?.id}`
 * whenever a different shortcut starts editing, so field state always
 * starts fresh — the same convention `Settings.tsx` already uses for its
 * add/edit form.
 */
export function EditShortcutModal({ open, shortcut, categories, onClose, onSave }: EditShortcutModalProps) {
  const [label, setLabel] = useState(shortcut?.label ?? '')
  const [url, setUrl] = useState(shortcut?.url ?? '')
  const [categoryId, setCategoryId] = useState(shortcut?.categoryId ?? NO_CATEGORY_VALUE)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit() {
    if (!shortcut) {
      return
    }
    const input: ShortcutInput = {
      label,
      url,
      ...(categoryId ? { categoryId } : {}),
    }
    const result = onSave(shortcut.id, input)
    if (result.ok) {
      setError(null)
      onClose()
    } else {
      setError(result.error)
    }
  }

  return (
    <GlassDialog open={open && shortcut !== null} onClose={onClose} title="Editar acceso directo">
      {shortcut ? (
        <div className="edit-shortcut-modal">
          <ShortcutPreview label={label} url={url} icon={shortcut.icon} />
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
            onCancel={onClose}
          />
        </div>
      ) : null}
    </GlassDialog>
  )
}
