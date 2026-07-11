import { getNextThemeMode } from '../../services/theme'
import type { ThemeMode } from '../../types/dashboard'
import './ThemeToggle.css'

export interface ThemeToggleProps {
  mode: ThemeMode
  onChange: (mode: ThemeMode) => void
}

const THEME_LABELS: Record<ThemeMode, string> = {
  system: 'Sistema',
  light: 'Claro',
  dark: 'Oscuro',
}

/** Cycles system -> light -> dark on activation. Persistence is the caller's responsibility. */
export function ThemeToggle({ mode, onChange }: ThemeToggleProps) {
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`Cambiar tema, actualmente ${THEME_LABELS[mode]}`}
      onClick={() => onChange(getNextThemeMode(mode))}
    >
      {THEME_LABELS[mode]}
    </button>
  )
}
