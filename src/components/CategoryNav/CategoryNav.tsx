import type { ShortcutCategory } from '../../types/dashboard'
import './CategoryNav.css'

export interface CategoryNavProps {
  categories: ShortcutCategory[]
  activeCategoryId: string | null
  onSelectCategory: (categoryId: string | null) => void
}

/**
 * Lets the user scan/filter shortcuts by category. Renders nothing when
 * there are no non-empty categories to show, so it never adds clutter on
 * its own (`categories` is expected to already be filtered via
 * `getNonEmptyCategories`).
 */
export function CategoryNav({ categories, activeCategoryId, onSelectCategory }: CategoryNavProps) {
  if (categories.length === 0) {
    return null
  }

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
        <button
          key={category.id}
          type="button"
          className="category-nav__item"
          aria-pressed={activeCategoryId === category.id}
          onClick={() => onSelectCategory(category.id)}
        >
          {category.name}
        </button>
      ))}
    </nav>
  )
}
