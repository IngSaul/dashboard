import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { defaultEventBus } from '../services/eventBus'
import type { SettingsSectionId } from '../types/events'

/**
 * `SettingsState` slice: `SettingsDrawer` open/closed and active section —
 * UI navigation state only, holding no domain data (per plan.md's ownership
 * rules — opening the "Wallpaper" section reads/writes `ThemeState`, this
 * slice only navigates there). Ephemeral: not persisted across reloads.
 */
export interface SettingsState {
  isOpen: boolean
  activeSection: SettingsSectionId | null
  /** Opens the drawer, optionally jumping straight to `section`. */
  open(section?: SettingsSectionId): void
  close(): void
  setSection(section: SettingsSectionId): void
}

const SettingsContext = createContext<SettingsState | undefined>(undefined)

export interface SettingsProviderProps {
  children: ReactNode
}

/**
 * Listens for `eventBus`'s `settings:open-section` so another slice (e.g. a
 * future `CommandPalette` command) can open a specific section without
 * importing `SettingsDrawer`/this provider directly.
 */
export function SettingsProvider({ children }: SettingsProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<SettingsSectionId | null>(null)

  useEffect(
    () =>
      defaultEventBus.on('settings:open-section', ({ section }) => {
        setActiveSection(section)
        setIsOpen(true)
      }),
    [],
  )

  const open = useCallback((section?: SettingsSectionId) => {
    if (section) {
      setActiveSection(section)
    }
    setIsOpen(true)
  }, [])

  const close = useCallback(() => setIsOpen(false), [])

  const setSection = useCallback((section: SettingsSectionId) => setActiveSection(section), [])

  const value = useMemo<SettingsState>(
    () => ({ isOpen, activeSection, open, close, setSection }),
    [isOpen, activeSection, open, close, setSection],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- the Provider/hook pair is the intended shape for this module (tasks.md T047).
export function useSettingsState(): SettingsState {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettingsState must be used within a SettingsProvider')
  }
  return context
}
