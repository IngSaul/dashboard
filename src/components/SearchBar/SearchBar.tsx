import { useId, useState, type FormEvent, type KeyboardEvent } from 'react'
import { defaultSearchEngine } from '../../services/searchEngine'
import { getNextRovingIndex, isRovingNavigationKey } from '../../utils/keyboard'
import type { SearchPreference } from '../../types/dashboard'
import './SearchBar.css'

export interface SearchBarProps {
  searchPreference: SearchPreference
}

/**
 * Site search, backed by `searchEngine` (T096) scoped to `web`/`shortcut`
 * sources, with a keyboard-navigable suggestions list (reuses
 * `utils/keyboard.ts`'s roving-index helpers, like `GlassDropdown`).
 * Pressing Enter activates whichever suggestion is highlighted — index 0
 * is always the `web` source's own result when the query is non-empty and
 * the URL template is valid, so this preserves the exact feature-001
 * Enter-to-search behavior with no special-case fallback needed.
 */
export function SearchBar({ searchPreference }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const listboxId = useId()

  const results = query.trim() === '' ? [] : defaultSearchEngine.query(query, { kinds: ['web', 'shortcut'] })

  function activateResult(index: number): void {
    const selected = results[index]
    if (!selected) {
      return
    }
    selected.onSelect()
    setQuery('')
    setActiveIndex(0)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    activateResult(activeIndex)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (results.length === 0 || !isRovingNavigationKey(event.key)) {
      return
    }
    event.preventDefault()
    const key = event.key
    setActiveIndex((current) => getNextRovingIndex(current, results.length, key))
  }

  return (
    <form role="search" aria-label="Site search" className="search-bar" onSubmit={handleSubmit}>
      <div className="search-bar__field">
        <input
          type="text"
          aria-label="Search"
          placeholder={`Search with ${searchPreference.providerName}`}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setActiveIndex(0)
          }}
          onKeyDown={handleKeyDown}
          className="search-bar__input"
          aria-expanded={results.length > 0}
          aria-controls={listboxId}
          aria-activedescendant={results.length > 0 ? `${listboxId}-${activeIndex}` : undefined}
        />
        <button type="submit" className="search-bar__submit">
          Search
        </button>
      </div>
      {results.length > 0 ? (
        <ul className="search-bar__suggestions" role="listbox" id={listboxId} aria-label="Suggestions">
          {results.map((result, index) => (
            <li
              key={result.id}
              id={`${listboxId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={
                index === activeIndex
                  ? 'search-bar__suggestion search-bar__suggestion--active'
                  : 'search-bar__suggestion'
              }
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => activateResult(index)}
            >
              {result.label}
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  )
}
