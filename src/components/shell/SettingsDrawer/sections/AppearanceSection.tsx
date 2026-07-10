import { useThemeState } from '../../../../state/ThemeProvider'
import { GlassDropdown } from '../../../glass/GlassDropdown/GlassDropdown'
import { GlassInput } from '../../../glass/GlassInput/GlassInput'

const DENSITY_OPTIONS = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
]

/** Appearance group: accent color + density. */
export function AppearanceSection() {
  const { appearance, setAppearance } = useThemeState()

  return (
    <section className="settings-section" aria-label="Appearance">
      <h3 className="settings-section__heading">Appearance</h3>
      <GlassInput
        label="Accent color"
        type="color"
        value={appearance.accentColor}
        onChange={(event) => setAppearance({ ...appearance, accentColor: event.target.value })}
      />
      <GlassDropdown
        label="Density"
        options={DENSITY_OPTIONS}
        value={appearance.density}
        onChange={(value) =>
          setAppearance({ ...appearance, density: value as typeof appearance.density })
        }
      />
    </section>
  )
}
