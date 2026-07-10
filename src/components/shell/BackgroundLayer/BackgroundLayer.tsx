import { useThemeState } from '../../../state/ThemeProvider'
import './BackgroundLayer.css'

/**
 * Renders `ThemeState.wallpaper`'s already-resolved CSS values (background
 * image, gradient, dim overlay, blur — see
 * `backgroundEngine.resolveBackground()`) as a fixed full-bleed layer behind
 * the rest of `AppShell`. Contains no resolution logic of its own.
 */
export function BackgroundLayer() {
  const { resolvedBackground } = useThemeState()
  const { backgroundImage, gradient, overlayColor, filter } = resolvedBackground

  const layers = [gradient, backgroundImage].filter((layer): layer is string => layer !== null)

  return (
    <div className="background-layer" aria-hidden="true">
      <div
        className="background-layer__image"
        style={{
          backgroundImage: layers.length > 0 ? layers.join(', ') : undefined,
          filter: filter ?? undefined,
        }}
      />
      <div className="background-layer__overlay" style={{ backgroundColor: overlayColor }} />
    </div>
  )
}
