import { useEffect, useRef } from 'react'
import { Settings as SettingsIcon, X } from 'lucide-react'
import { useSettingsState } from '../../../state/SettingsProvider'
import { GlassIconButton } from '../../glass/GlassIconButton/GlassIconButton'
import { GlassPanel } from '../../glass/GlassPanel/GlassPanel'
import { WidgetSettings } from '../../WidgetSettings/WidgetSettings'
import { ShortcutSettings } from './ShortcutSettings'
import { AccessibilitySection } from './sections/AccessibilitySection'
import { AnimationsSection } from './sections/AnimationsSection'
import { AppearanceSection } from './sections/AppearanceSection'
import { GlassSection } from './sections/GlassSection'
import { ThemeSection } from './sections/ThemeSection'
import { WallpaperSection } from './sections/WallpaperSection'
import './SettingsDrawer.css'

/**
 * Slide-in surface hosting widget/theme settings. Closed by default and
 * never blocks/delays `Workspace` rendering while closed (per the UI
 * contract's AppShell rule). Composes `WidgetSettings`, the existing
 * `Settings` component (via `ShortcutSettings`), and the six independently
 * editable `ThemePreferences` group sections — every one of them persists
 * immediately through its own state slice/service, with no separate save
 * step (T081).
 *
 * Scrolls to `activeSection` (each section has a matching
 * `#settings-section-{id}` element) whenever it opens or changes — this is
 * what makes a `CommandPalette`/quick-action command like "Open Wallpaper
 * Settings" (T095), which only emits `eventBus`'s `settings:open-section`,
 * actually land the user on that section rather than just opening the
 * drawer to wherever it happened to be scrolled.
 */
export function SettingsDrawer() {
  const { isOpen, activeSection, open, close } = useSettingsState()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null
      panelRef.current?.focus()
    } else {
      previousFocusRef.current?.focus()
      previousFocusRef.current = null
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !activeSection) {
      return
    }
    const section = document.getElementById(`settings-section-${activeSection}`)
    section?.scrollIntoView({ block: 'start' })
    section?.focus()
  }, [isOpen, activeSection])

  useEffect(() => {
    if (!isOpen) {
      return
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        close()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, close])

  return (
    <>
      <GlassIconButton
        className="settings-drawer__toggle"
        aria-label="Toggle settings"
        aria-expanded={isOpen}
        onClick={() => (isOpen ? close() : open())}
      >
        <SettingsIcon aria-hidden="true" />
      </GlassIconButton>

      <div
        className="settings-drawer__scrim"
        data-open={isOpen}
        aria-hidden="true"
        onClick={close}
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        className="settings-drawer"
        data-open={isOpen}
        inert={!isOpen}
        aria-hidden={!isOpen}
        role="dialog"
        aria-label="Settings"
      >
        <GlassPanel as="aside" className="settings-drawer__panel">
          <div className="settings-drawer__header">
            <h2 className="settings-drawer__title">Settings</h2>
            <GlassIconButton aria-label="Close settings" onClick={close}>
              <X aria-hidden="true" />
            </GlassIconButton>
          </div>
          <div className="settings-drawer__body">
            <WidgetSettings />
            <ShortcutSettings />
            <ThemeSection />
            <AppearanceSection />
            <WallpaperSection />
            <GlassSection />
            <AnimationsSection />
            <AccessibilitySection />
          </div>
        </GlassPanel>
      </div>
    </>
  )
}
