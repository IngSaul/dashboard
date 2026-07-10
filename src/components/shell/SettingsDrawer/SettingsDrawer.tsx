import { useEffect, useRef } from 'react'
import { Settings, X } from 'lucide-react'
import { useSettingsState } from '../../../state/SettingsProvider'
import { GlassIconButton } from '../../glass/GlassIconButton/GlassIconButton'
import { GlassPanel } from '../../glass/GlassPanel/GlassPanel'
import './SettingsDrawer.css'

/**
 * Slide-in surface hosting widget/theme settings. Closed by default and
 * never blocks/delays `Workspace` rendering while closed (per the UI
 * contract's AppShell rule). This shell only wires open/close/focus/
 * `Escape` behavior — `WidgetSettings` and the six `ThemeProvider` group
 * sections are composed inside `.settings-drawer__body` in later tasks
 * (T076-T081).
 */
export function SettingsDrawer() {
  const { isOpen, open, close } = useSettingsState()
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
        <Settings aria-hidden="true" />
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
            {/* Widget list + six ThemePreferences group sections compose here (T076-T081). */}
          </div>
        </GlassPanel>
      </div>
    </>
  )
}
