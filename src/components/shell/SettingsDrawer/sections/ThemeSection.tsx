import { useThemeState } from '../../../../state/ThemeProvider'
import { ThemeToggle } from '../../../ThemeToggle/ThemeToggle'

/** Theme group (T078): wires the existing `ThemeToggle` to `ThemeState`'s `theme` group — `ThemeToggle` itself needed no changes, since its `mode`/`onChange` shape already matches. */
export function ThemeSection() {
  const { theme, setTheme } = useThemeState()

  return (
    <section className="settings-section" aria-label="Theme">
      <h3 className="settings-section__heading">Theme</h3>
      <ThemeToggle mode={theme.mode} onChange={(mode) => setTheme({ mode })} />
    </section>
  )
}
