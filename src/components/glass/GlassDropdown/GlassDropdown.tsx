import { useEffect, useId, useRef, useState } from 'react'
import { getNextRovingIndex, isActivationKey, isRovingNavigationKey } from '../../../utils/keyboard'
import './GlassDropdown.css'

export interface GlassDropdownOption {
  value: string
  label: string
}

export interface GlassDropdownProps {
  /** Visible label for the trigger (e.g. "Column", "Category"). */
  label: string
  options: GlassDropdownOption[]
  value: string
  onChange: (value: string) => void
}

/**
 * Accessible select-style menu (e.g. the column/category pickers planned
 * for `WidgetSettings`). A native `<select>` would be simpler but can't be
 * given the glass material's translucent popup styling in most browsers,
 * so this is a listbox built from `GlassButton` + a floating `role="listbox"`
 * popup, reusing the same roving-tabindex helpers as the shortcut/category
 * grids.
 */
export function GlassDropdown({ label, options, value, onChange }: GlassDropdownProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, options.findIndex((o) => o.value === value)))
  const containerRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const listboxRef = useRef<HTMLUListElement | null>(null)
  const listboxId = useId()
  const selected = options.find((option) => option.value === value)

  useEffect(() => {
    if (!open) {
      return
    }
    listboxRef.current?.focus()
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  function closeAndRefocus() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  function selectOption(index: number) {
    const option = options[index]
    if (!option) {
      return
    }
    onChange(option.value)
    closeAndRefocus()
  }

  function handleListKeyDown(event: React.KeyboardEvent<HTMLUListElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeAndRefocus()
      return
    }
    if (isActivationKey(event.key)) {
      event.preventDefault()
      selectOption(activeIndex)
      return
    }
    if (isRovingNavigationKey(event.key)) {
      event.preventDefault()
      const key = event.key
      setActiveIndex((current) => getNextRovingIndex(current, options.length, key))
    }
  }

  return (
    <div className="glass-dropdown" ref={containerRef}>
      <span className="glass-dropdown__label" id={`${listboxId}-label`}>
        {label}
      </span>
      <button
        type="button"
        ref={triggerRef}
        className="glass-dropdown__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${listboxId}-label ${listboxId}-value`}
        onClick={() => setOpen((current) => !current)}
      >
        <span id={`${listboxId}-value`}>{selected?.label ?? 'Select…'}</span>
      </button>
      {open && (
        <ul
          role="listbox"
          id={listboxId}
          className="glass-dropdown__listbox"
          aria-labelledby={`${listboxId}-label`}
          tabIndex={-1}
          ref={listboxRef}
          onKeyDown={handleListKeyDown}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              className={`glass-dropdown__option ${index === activeIndex ? 'glass-dropdown__option--active' : ''}`.trim()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectOption(index)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
