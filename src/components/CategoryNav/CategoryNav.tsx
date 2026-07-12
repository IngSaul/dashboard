import { AddCategoryCard } from '../AddCategoryCard/AddCategoryCard'
import { CategoryActionsMenu } from '../CategoryActionsMenu/CategoryActionsMenu'
import type { ShortcutCategory } from '../../types/dashboard'
import './CategoryNav.css'

export interface CategoryNavProps {
  categories: ShortcutCategory[]
  activeCategoryId: string | null
  onSelectCategory: (categoryId: string | null) => void
  onEditCategory: (category: ShortcutCategory) => void
  onDeleteCategory: (category: ShortcutCategory) => void
  onAddCategory: () => void
}

/**
 * Lets the user scan/filter shortcuts by category, rename/delete a category
 * via its hover/focus-revealed `CategoryActionsMenu` (same pattern
 * `ShortcutActionsMenu` uses on `ShortcutCard`), and create a new one via
 * the trailing `AddCategoryCard` tile (mirrors `AddShortcutCard`'s "next
 * slot" tile on the shortcuts grid). Always renders — even with zero
 * categories — since the "+" tile must stay reachable to create the first
 * one; `categories` is expected to already be filtered to visible ones, but
 * unlike the read-only nav this used to be, it is *not* filtered down to
 * non-empty categories, since an empty category still needs to be
 * reachable here to be renamed or deleted.
 */
export function CategoryNav({
  categories,
  activeCategoryId,
  onSelectCategory,
  onEditCategory,
  onDeleteCategory,
  onAddCategory,
}: CategoryNavProps) {
  return (
    <nav className="category-nav" aria-label="Categorías de accesos directos">
      <button
        type="button"
        className="category-nav__item"
        aria-pressed={activeCategoryId === null}
        onClick={() => onSelectCategory(null)}
      >
        Todas
      </button>
      {categories.map((category) => (
        <div key={category.id} className="category-nav__entry">
          <button
            type="button"
            className="category-nav__item"
            aria-pressed={activeCategoryId === category.id}
            onClick={() => onSelectCategory(category.id)}
          >
            {category.name}
          </button>
          <CategoryActionsMenu
            label={category.name}
            onEdit={() => onEditCategory(category)}
            onDelete={() => onDeleteCategory(category)}
          />
        </div>
      ))}
      <AddCategoryCard onClick={onAddCategory} />
    </nav>
  )
}
