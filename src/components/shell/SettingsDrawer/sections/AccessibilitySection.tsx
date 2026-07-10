import { useThemeState } from '../../../../state/ThemeProvider'
import { GlassDropdown } from '../../../glass/GlassDropdown/GlassDropdown'
import { GlassInput } from '../../../glass/GlassInput/GlassInput'

const FOCUS_RING_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'high-visibility', label: 'High visibility' },
]

/** Accessibility group: contrast boost, focus ring style, and font scale — extends feature 001's existing accessibility support. */
export function AccessibilitySection() {
  const { accessibility, setAccessibility } = useThemeState()

  return (
    <section className="settings-section" aria-label="Accessibility">
      <h3 className="settings-section__heading">Accessibility</h3>
      <label className="settings-section__row">
        <input
          type="checkbox"
          checked={accessibility.contrastBoost}
          onChange={(event) =>
            setAccessibility({ ...accessibility, contrastBoost: event.target.checked })
          }
        />
        Contrast boost
      </label>
      <GlassDropdown
        label="Focus ring style"
        options={FOCUS_RING_OPTIONS}
        value={accessibility.focusRingStyle}
        onChange={(value) =>
          setAccessibility({
            ...accessibility,
            focusRingStyle: value as typeof accessibility.focusRingStyle,
          })
        }
      />
      <GlassInput
        label="Font scale"
        type="number"
        min={0.9}
        max={1.5}
        step={0.1}
        value={accessibility.fontScale}
        onChange={(event) =>
          setAccessibility({ ...accessibility, fontScale: Number(event.target.value) })
        }
      />
    </section>
  )
}
