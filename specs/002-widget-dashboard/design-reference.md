# Visual Design Reference: Glassmorphism Widget Dashboard

**Feature**: [spec.md](spec.md)

**Purpose**: Capture the visual language derived from the user-provided reference screenshot,
to be used as input when drafting the design-system section of `plan.md`. This is direction,
not a pixel-exact copy target — layout, spacing, and component sizing are free to adapt to
actual widget content and responsive breakpoints.

## Source

User-supplied screenshot of a dark, photographic-background start page (weather + markets
widgets on the left, search + clock + categorized shortcut grid on the right, floating edit
control bottom-right). Referenced 2026-07-09; not stored in the repo (describe only, do not
reproduce third-party imagery as an asset).

## Observed Visual Language

**Background**
- Full-bleed, dark, photographic/atmospheric image (not a flat color or gradient) sits behind
  all glass surfaces. Must support swappable backgrounds (user's own image, curated default,
  or fallback dark gradient when no image is configured), since the dashboard has no built-in
  asset licensing story.

**Glass surface (cards/panels)**
- Translucent dark fill + backdrop blur + a hairline border (low-opacity light border, ~1px)
  + soft rounded corners (large radius, ~16–20px).
- No drop shadows beyond a very soft ambient one — depth comes from blur/translucency, not shadow stacking.
- Consistent corner radius and border treatment across every widget, the search bar, the pill
  buttons, and the shortcut grid panel — one glass "material," reused everywhere.

**Layout / hierarchy**
- Three-column layout, not two: a narrower fixed-width **left column** for compact status
  widgets (weather, markets/server-status-style data), a wider **center column** for search +
  clock + the shortcut grid, and a **right column** reserved for additional widgets. The right
  column is empty in the reference screenshot only because no widgets were assigned to it —
  it is a real, first-class widget slot, not decorative whitespace, and the layout/grid system
  must treat it as such (e.g. Docker container status, calendar, notes, or any future widget
  can be dropped there).
- Vertical stack within each side column; widgets are self-contained cards with generous
  internal padding and a consistent card width per column.
- Center column reads top-to-bottom: search bar → clock/date → quick-filter pills → shortcut
  grid panel(s).
- All three columns must independently reflow for tablet (e.g. stacking left → center → right,
  or collapsing side columns below the shortcut grid) per the Responsive requirement already in
  spec.md — the three-column arrangement is a desktop-width layout, not a fixed assumption for
  every breakpoint.

**Typography**
- Clock uses a large, light/regular-weight numeral treatment as the single dominant text
  element on the page — establishes scale hierarchy at a glance.
- Widget titles and labels use a smaller, medium-weight sans-serif; secondary data (dates,
  deltas, sublabels) drop to a muted/lower-contrast tone rather than a smaller weight jump.
- All text sits on translucent glass, so contrast against the busy background must be
  guaranteed (semi-opaque scrim behind text where needed) — ties to the accessibility/contrast
  requirement already in spec.md's Assumptions.

**Iconography**
- App/shortcut icons are colorful, rounded-square tiles at a consistent size, with a label
  beneath — grid of icon+label pairs, evenly spaced, wrapping into rows.
- Non-shortcut icons (weather glyph, market trend sparkline, kebab/overflow menu) are simple,
  monochrome/line-style, low-visual-weight — color is reserved for shortcut/app icons and
  data-meaning (green/red for market or status deltas), not decoration.

**Interactive chrome**
- Pill-shaped quick-filter/action buttons (e.g. category or widget-scope toggles) sit inline
  near the clock, same glass material as cards.
- Search input is itself a full-width glass pill, leading icon, centered above the fold.
- A floating circular action button (edit/pencil) anchors bottom-right as the entry point into
  layout/customization mode — keeps editing controls out of the glanceable default view.

**Motion (inferred, not shown in a static screenshot)**
- Given the constitution's "restrained and purposeful" motion requirement, treat this reference
  as implying subtle transitions only: card enter/exit on widget add-remove, smooth reorder,
  hover/focus state changes on shortcuts and pills. No ambient/looping decorative motion, and
  all motion must respect `prefers-reduced-motion`.

## Constitution Tension to Resolve in Plan

- **V. Clean UI** requires minimalism and restraint; the reference's colorful icon grid and
  photographic background are visually richer than a flat minimalist page. Resolution to carry
  into `plan.md`: keep the *background* as the sole decorative element (user-controlled, muted
  by default), keep glass surfaces neutral/monochrome, and let color appear only where it
  carries meaning (brand icons the user chose, status deltas) — not added by the dashboard itself.
- Background imagery must not block first paint or reintroduce a network dependency at
  startup — resolve as a locally-bundled/default asset or previously-cached user image, loaded
  progressively, consistent with the **III. Fast** principle.

## How to Use This

When running `/speckit-plan`, incorporate this file's observations into the plan's UI/design
system section (glass surface tokens, layout zones, typography scale, icon treatment, motion
rules) rather than treating it as new functional scope — `spec.md` remains the source of truth
for *what* the dashboard does; this file informs *how it looks*.
