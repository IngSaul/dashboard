import { useState, type FormEvent } from 'react'
import type { CategoryInput, CategoryMutationResult } from '../../services/categories'
import type { ShortcutInput, ShortcutMutationResult } from '../../services/shortcuts'
import type { Shortcut, ShortcutCategory } from '../../types/dashboard'
import './Settings.css'

export interface SettingsProps {
  categories: ShortcutCategory[]
  editingShortcut: Shortcut | null
  onSubmit: (input: ShortcutInput) => ShortcutMutationResult
  onCancelEdit: () => void
  onAddCategory: (input: CategoryInput) => CategoryMutationResult
}

/**
 * Add/edit form for a single shortcut, plus a small "new category" form so
 * shortcuts have somewhere to be categorized beyond the default category
 * (FR-009; `categories.ts`'s `addCategory` already existed and was tested
 * in T037/T040 but had no UI until this Polish-phase fix). `editingShortcut`
 * controls whether the shortcut form is in add or edit mode; per-shortcut
 * Edit/Remove actions live on `ShortcutCard` (T043), which is what sets
 * `editingShortcut` via the parent `Dashboard`. The parent must render this
 * with `key={editingShortcut?.id ?? 'new'}` so switching targets remounts
 * the form with fresh initial state instead of syncing it via an effect.
 */
export function Settings({
  categories,
  editingShortcut,
  onSubmit,
  onCancelEdit,
  onAddCategory,
}: SettingsProps) {
  const [label, setLabel] = useState(editingShortcut?.label ?? '')
  const [url, setUrl] = useState(editingShortcut?.url ?? '')
  const [categoryId, setCategoryId] = useState(editingShortcut?.categoryId ?? '')
  const [error, setError] = useState<string | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [categoryError, setCategoryError] = useState<string | null>(null)

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

  function handleAddCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = onAddCategory({ name: categoryName })
    if (result.ok) {
      setCategoryName('')
      setCategoryError(null)
    } else {
      setCategoryError(result.error)
    }
  }

  return (
    <section className="settings" aria-label="Gestionar accesos directos">
      <form className="settings__form" onSubmit={handleSubmit}>
        <label className="settings__field">
          Nombre
          <input type="text" value={label} onChange={(event) => setLabel(event.target.value)} />
        </label>
        <label className="settings__field">
          URL
          <input type="text" value={url} onChange={(event) => setUrl(event.target.value)} />
        </label>
        <label className="settings__field">
          Categoría
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">Ninguna</option>
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
          <button type="submit">{editingShortcut ? 'Guardar acceso directo' : 'Añadir acceso directo'}</button>
          {editingShortcut ? (
            <button type="button" onClick={onCancelEdit}>
              Cancelar
            </button>
          ) : null}
        </div>
      </form>

      <form className="settings__form settings__form--category" onSubmit={handleAddCategory}>
        <label className="settings__field">
          Nueva categoría
          <input
            type="text"
            value={categoryName}
            onChange={(event) => setCategoryName(event.target.value)}
          />
        </label>
        {categoryError ? (
          <p className="settings__error" role="alert">
            {categoryError}
          </p>
        ) : null}
        <div className="settings__actions">
          <button type="submit">Añadir categoría</button>
        </div>
      </form>
    </section>
  )
}
