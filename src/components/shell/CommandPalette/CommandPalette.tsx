import { useEffect, useRef } from 'react'
import { useSearchState } from '../../../state/SearchProvider'
import { GlassInput } from '../../glass/GlassInput/GlassInput'
import { StatusMessage } from '../../StatusMessage/StatusMessage'
import './CommandPalette.css'

/**
 * Keyboard-invoked palette shell. Built on the native `<dialog>` element
 * (like `GlassDialog`) so focus-trapping, top-layer stacking, and
 * `Escape`-to-close come from the browser rather than hand-rolled JS (per
 * the UI contract's "MUST trap focus while open... MUST close on Escape
 * without side effects" rule). Sources results from `SearchState`, which is
 * always empty for now — `searchEngine` wiring lands in Polish
 * (T093-T098); this shell only owns open/close/keyboard-toggle behavior.
 */
export function CommandPalette() {
  const { isPaletteOpen, results, query, setQuery, togglePalette, closePalette } = useSearchState()
  const dialogRef = useRef<HTMLDialogElement | null>(null)

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
        autoFocus
      />
      <div className="command-palette__results" role="listbox" aria-label="Results">
        {results.length === 0 ? (
          <StatusMessage message={query === '' ? 'Type to search…' : 'No results found.'} />
        ) : (
          results.map((result) => (
            <button
              key={result.id}
              type="button"
              role="option"
              className="command-palette__result"
              onClick={() => {
                result.onSelect()
                closePalette()
              }}
            >
              {result.label}
            </button>
          ))
        )}
      </div>
    </dialog>
  )
}
