import { useState, type FormEvent } from 'react'
import type { ShortcutInput, ShortcutMutationResult } from '../../services/shortcuts'
import type { Shortcut, ShortcutCategory } from '../../types/dashboard'
import './Settings.css'

export interface SettingsProps {
  categories: ShortcutCategory[]
  editingShortcut: Shortcut | null
  onSubmit: (input: ShortcutInput) => ShortcutMutationResult
  onCancelEdit: () => void
}

/**
 * Add/edit form for a single shortcut. `editingShortcut` controls whether
 * the form is in add or edit mode; per-shortcut Edit/Remove actions live on
 * `ShortcutCard` (T043), which is what sets `editingShortcut` via the
 * parent `Dashboard`. The parent must render this with
 * `key={editingShortcut?.id ?? 'new'}` so switching targets remounts the
 * form with fresh initial state instead of syncing it via an effect.
 */
export function Settings({ categories, editingShortcut, onSubmit, onCancelEdit }: SettingsProps) {
  const [label, setLabel] = useState(editingShortcut?.label ?? '')
  const [url, setUrl] = useState(editingShortcut?.url ?? '')
  const [categoryId, setCategoryId] = useState(editingShortcut?.categoryId ?? '')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input: ShortcutInput = {
      label,
      url,
      ...(categoryId ? { categoryId } : {}),
    }
    const result = onSubmit(input)
    if (result.ok) {
      setLabel('')
      setUrl('')
      setCategoryId('')
      setError(null)
    } else {
      setError(result.error)
    }
  }

  return (
    <section className="settings" aria-label="Manage shortcuts">
      <form className="settings__form" onSubmit={handleSubmit}>
        <label className="settings__field">
          Label
          <input type="text" value={label} onChange={(event) => setLabel(event.target.value)} />
        </label>
        <label className="settings__field">
          URL
          <input type="text" value={url} onChange={(event) => setUrl(event.target.value)} />
        </label>
        <label className="settings__field">
          Category
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">None</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        {error ? (
          <p className="settings__error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="settings__actions">
          <button type="submit">{editingShortcut ? 'Save shortcut' : 'Add shortcut'}</button>
          {editingShortcut ? (
            <button type="button" onClick={onCancelEdit}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>
    </section>
  )
}
