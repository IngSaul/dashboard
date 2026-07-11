import { useEffect, useId, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useSearchState } from '../../../state/SearchProvider'
import { GlassInput } from '../../glass/GlassInput/GlassInput'
import { StatusMessage } from '../../StatusMessage/StatusMessage'
import { getNextRovingIndex, isRovingNavigationKey } from '../../../utils/keyboard'
import './CommandPalette.css'

/**
 * Keyboard-invoked palette shell. Built on the native `<dialog>` element
 * (like `GlassDialog`) so focus-trapping, top-layer stacking, and
 * `Escape`-to-close come from the browser rather than hand-rolled JS (per
 * the UI contract's "MUST trap focus while open... MUST close on Escape
 * without side effects" rule). Sources results from `SearchState`
 * (`searchEngine.query()`, unscoped — every registered source), reusing
 * `utils/keyboard.ts`'s roving-index helpers for arrow-key navigation, the
 * same pattern `SearchBar`/`GlassDropdown` use (T097).
 */
export function CommandPalette() {
  const {
    isPaletteOpen,
    results,
    query,
    setQuery,
    selectedIndex,
    setSelectedIndex,
    togglePalette,
    closePalette,
  } = useSearchState()
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const listboxId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) {
      return
    }
    if (isPaletteOpen && !dialog.open) {
      dialog.showModal()
    } else if (!isPaletteOpen && dialog.open) {
      dialog.close()
    }
  }, [isPaletteOpen])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isToggleShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k'
      if (isToggleShortcut) {
        event.preventDefault()
        togglePalette()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [togglePalette])

  function activateResult(index: number): void {
    const selected = results[index]
    if (!selected) {
      return
    }
    selected.onSelect()
    closePalette()
  }

  function handleInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>): void {
    if (results.length === 0) {
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      activateResult(selectedIndex)
      return
    }
    if (isRovingNavigationKey(event.key)) {
      event.preventDefault()
      const key = event.key
      setSelectedIndex(getNextRovingIndex(selectedIndex, results.length, key))
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="command-palette"
      aria-label="Command palette"
      onClose={closePalette}
      onCancel={closePalette}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          closePalette()
        }
      }}
    >
      <GlassInput
        label="Search or run a command"
        hideLabel
        placeholder="Search or run a command…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={handleInputKeyDown}
        role="combobox"
        aria-expanded={results.length > 0}
        aria-controls={listboxId}
        aria-activedescendant={results.length > 0 ? `${listboxId}-${selectedIndex}` : undefined}
        autoFocus
      />
      <div
        className="command-palette__results"
        role="listbox"
        id={listboxId}
        aria-label="Results"
      >
        {results.length === 0 ? (
          <StatusMessage message={query === '' ? 'Type to search…' : 'No results found.'} />
        ) : (
          results.map((result, index) => (
            <button
              key={result.id}
              id={`${listboxId}-${index}`}
              type="button"
              role="option"
              aria-selected={index === selectedIndex}
              className={
                index === selectedIndex
                  ? 'command-palette__result command-palette__result--active'
                  : 'command-palette__result'
              }
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => activateResult(index)}
            >
              {result.label}
            </button>
          ))
        )}
      </div>
    </dialog>
  )
}
