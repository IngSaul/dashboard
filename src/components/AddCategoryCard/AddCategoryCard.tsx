import { Plus } from 'lucide-react'
import './AddCategoryCard.css'

export interface AddCategoryCardProps {
  onClick: () => void
}

/**
 * Trailing tile in `CategoryNav` that opens `AddCategoryModal` — the same
 * "next slot" philosophy `AddShortcutCard` applies to the shortcuts grid,
 * adapted to the pill shape of category items: it composes the base
 * `.category-nav__item` class so its size/border/glass styling stay
 * identical to every other pill automatically, with `add-category-card`
 * layered on for the centered "+" and low-opacity idle state. No creation
 * logic lives here — it only reports the click; `ShortcutsWidget` owns the
 * modal's open state and `useShortcutLibrary`'s `createCategory`.
 */
export function AddCategoryCard({ onClick }: AddCategoryCardProps) {
  return (
    <button
      type="button"
      className="category-nav__item add-category-card"
      aria-label="Añadir categoría"
      onClick={onClick}
    >
      <Plus className="add-category-card__icon" aria-hidden="true" />
    </button>
  )
}
