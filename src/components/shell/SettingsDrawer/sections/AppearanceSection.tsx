import { useThemeState } from '../../../../state/ThemeProvider'
import { GlassDropdown } from '../../../glass/GlassDropdown/GlassDropdown'
import { GlassInput } from '../../../glass/GlassInput/GlassInput'

const DENSITY_OPTIONS = [
  { value: 'comfortable', label: 'Cómoda' },
  { value: 'compact', label: 'Compacta' },
]

/** Appearance group: accent color + density. */
export function AppearanceSection() {
  const { appearance, setAppearance } = useThemeState()

  return (
    <section className="settings-section" id="settings-section-appearance" aria-label="Apariencia" tabIndex={-1}>
      <h3 className="settings-section__heading">Apariencia</h3>
      <GlassInput
        label="Color de acento"
        type="color"
        value={appearance.accentColor}
        onChange={(event) => setAppearance({ ...appearance, accentColor: event.target.value })}
      />
      <GlassDropdown
        label="Densidad"
        options={DENSITY_OPTIONS}
        value={appearance.density}
        onChange={(value) =>
          setAppearance({ ...appearance, density: value as typeof appearance.density })
        }
      />
    </section>
  )
}
