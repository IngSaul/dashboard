import { useState, type FormEvent } from 'react'
import { GlassInput } from '../../glass/GlassInput/GlassInput'
import { GlassButton } from '../../glass/GlassButton/GlassButton'
import { addCategory, type CategoryInput } from '../../../services/categories'
import { loadDashboardConfig, saveDashboardConfig } from '../../../services/configStore'
import { defaultEventBus } from '../../../services/eventBus'
import type { ShortcutCategory } from '../../../types/dashboard'
import './ShortcutSettings.css'

/**
 * "Add category" is the only shortcut-related capability left in the
 * settings drawer — creating, editing, and deleting individual shortcuts
 * now all live on the main grid (`AddShortcutCard`/`AddShortcutModal`,
 * and `ShortcutActionsMenu`/`EditShortcutModal`/`GlassConfirmDialog`). A
 * new category still has no entry point anywhere on the grid itself, so
 * it stays here.
 *
 * `categories` has no owning 002 state slice (same situation as
 * `weatherPreference`), so this reads/writes it directly through
 * `configStore`, re-reading the full config at save time so a concurrent
 * edit to an unrelated field is never clobbered, and emits `eventBus`'s
 * `shortcuts:changed` so `ShortcutsWidget`/`AddShortcutModal`'s category
 * dropdown picks up the new category in the same session.
 */
export function ShortcutSettings() {
  const [categories, setCategories] = useState<ShortcutCategory[]>(
    () => loadDashboardConfig().categories,
  )
  const [categoryName, setCategoryName] = useState('')
  const [categoryError, setCategoryError] = useState<string | null>(null)

  function handleAddCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input: CategoryInput = { name: categoryName }
    const result = addCategory(categories, input)
    if (!result.ok) {
      setCategoryError(result.error)
      return
    }
    const config = loadDashboardConfig()
    saveDashboardConfig({ ...config, categories: result.categories })
    setCategories(result.categories)
    defaultEventBus.emit('shortcuts:changed', {})
    setCategoryName('')
    setCategoryError(null)
  }

  return (
    <section className="settings-section" aria-label="Categorías de accesos directos">
      <h3 className="settings-section__heading">Categorías</h3>
      <form className="shortcut-settings__category-form" onSubmit={handleAddCategory}>
        <GlassInput
          label="Nueva categoría"
          value={categoryName}
          onChange={(event) => setCategoryName(event.target.value)}
        />
        {categoryError ? (
          <p className="shortcut-settings__error" role="alert">
            {categoryError}
          </p>
        ) : null}
        <GlassButton type="submit">Añadir categoría</GlassButton>
      </form>
    </section>
  )
}
