# Quickstart: Personal Browser Dashboard

## Prerequisites

- Project dependencies installed (`npm install`).
- A browser available for manual or automated validation.

## Commands

```bash
npm run dev           # local dev server, for manual validation
npm run build          # production build (tsc -b && vite build)
npm run preview        # serve the production build locally
npm test                # unit + integration tests (Vitest) - covers scenarios 2, 3, 4, 5, 6, 9
npm run test:e2e        # end-to-end tests (Playwright) - covers scenarios 1, 2, 3, 4, 6, 7, 8
```

## References

- Feature spec: [spec.md](./spec.md)
- Data model: [data-model.md](./data-model.md)
- UI contract: [contracts/ui-contract.md](./contracts/ui-contract.md)

## Validation Scenarios

### 1. First Launch

1. Start the dashboard in a browser.
2. Open the dashboard as a new-tab replacement or direct local route.
3. Confirm search, date/time, weather area, and shortcut cards are visible.
4. Confirm there are no ads, recommendation feeds, notification streams, or
   unrelated content areas.
5. Confirm the dashboard is usable within one second in a production-style run.

**Expected outcome**: The dashboard is immediately useful for search and shortcut
access, with weather loading or unavailable state not blocking core actions.

**Validated**: PASS. `tests/e2e/firstLaunch.spec.ts` asserts search, date/time,
and shortcuts are visible within a 1s timeout, and that no `iframe`/ad-like
elements are present. `tests/integration/dashboardLaunch.test.tsx` covers the
same at the component level.

### 2. Search

1. Enter a normal search query.
2. Submit the query.
3. Return to the dashboard.
4. Submit an empty or whitespace-only query.

**Expected outcome**: The normal query opens the configured search destination.
The empty query does not navigate and does not disrupt the dashboard.

**Validated**: PASS. `tests/unit/search.test.ts` covers URL building/encoding
and empty/whitespace rejection. `tests/e2e/firstLaunch.spec.ts` submits a real
query through the browser (network intercepted, no live external call) and
confirms an empty submission does not navigate.

### 3. Shortcut Personalization

1. Add a shortcut with a label, destination, and category.
2. Edit the shortcut label or destination.
3. Reorder the shortcut.
4. Reload the dashboard.
5. Remove the shortcut and reload again.

**Expected outcome**: Shortcut changes persist across reloads, invalid input is
rejected without losing saved data, and removed shortcuts stay removed.

**Validated**: PASS. `tests/unit/shortcuts.test.ts` covers create/update/
remove/reorder and rejection of invalid input. `tests/integration/
shortcutPersonalization.test.tsx` and `tests/e2e/personalization.spec.ts`
cover add/edit/remove/reorder through the UI and confirm persistence across
a real reload. Reordering is exposed as "Move up"/"Move down" controls on
each shortcut card in management mode (added during Polish after this
scenario surfaced that FR-008's reorder requirement had no UI yet).

### 4. Category Behavior

1. Create at least two categories.
2. Assign shortcuts to each category.
3. Use the category controls to scan or filter shortcuts.
4. Leave one category empty.

**Expected outcome**: Category controls make shortcuts easier to scan, assigned
shortcuts appear in the right groups, and empty categories do not clutter the
main dashboard.

**Validated**: PASS. `tests/unit/categories.test.ts` covers category CRUD,
`filterShortcutsByCategory`, and `getNonEmptyCategories` (empty/hidden
categories excluded from navigation). `Settings` has a "New category" field
to create categories beyond the default "General" (added during Polish
after this scenario surfaced that T042's category-editing scope had no UI
yet, even though `addCategory` was already built and tested). Category
rename/hide/reorder still have no UI — out of scope for what the spec's
acceptance scenarios require, noted here for a future iteration.
`tests/integration/shortcutPersonalization.test.tsx` and
`tests/e2e/personalization.spec.ts` cover creating a category, assigning a
shortcut to it, and filtering through the real UI.

### 5. Weather Fallback

1. Validate the dashboard with weather available.
2. Simulate unavailable weather data or no network.
3. Reload the dashboard.

**Expected outcome**: Weather shows available conditions when possible. When it
cannot load, it shows a calm unavailable state and all non-weather features still
work.

**Validated**: PASS for the fallback path. `tests/unit/weather.test.ts`
covers `resolveWeatherSummary`'s loading/available/unavailable/disabled
states as a pure function. In this development environment there is no
browser geolocation permission to grant, so the "available conditions"
path (`fetchWeatherSummary` calling the Geolocation API + Open-Meteo) is
exercised only by the pure resolver test, not against a live successful
fetch — the unavailable/offline path is what's actually observed in
`tests/e2e/firstLaunch.spec.ts` and manual browser checks.

### 6. Theme Persistence

1. Switch to dark theme.
2. Reload the dashboard.
3. Switch to light theme.
4. Reload the dashboard.

**Expected outcome**: The selected theme is restored after reload and the
dashboard remains readable in both themes.

**Validated**: PASS. `tests/unit/theme.test.ts` covers mode resolution.
`tests/e2e/accessibilityAndTheme.spec.ts` toggles the theme, confirms the
applied `data-theme` attribute changes, reloads, and confirms it persists.

### 7. Keyboard and Accessibility

1. Navigate from the browser chrome into the dashboard with only the keyboard.
2. Move through search, categories, shortcuts, theme controls, and settings.
3. Activate primary actions from the keyboard.
4. Inspect accessible names for interactive controls.
5. Enable reduced-motion preference and repeat a motion-heavy interaction such
   as theme switching or category filtering.

**Expected outcome**: Focus order is logical, focus is visible, primary actions
work without a pointer, controls have accessible names, and reduced-motion
preference minimizes nonessential animation.

**Validated**: PASS. `tests/integration/keyboardNavigation.test.tsx` drives
search, theme, category filtering, and settings entirely by keyboard.
`tests/integration/accessibility.test.tsx` checks accessible names,
identifiable regions, natural tab order, and that reduced motion doesn't
break rendering. `tests/e2e/accessibilityAndTheme.spec.ts` confirms a real
visible focus outline in a real browser. All CSS transitions/animations
route through the global `prefers-reduced-motion: reduce` rule in
`index.css` (near-zero duration, one iteration), so no component needs its
own reduced-motion branching logic.

### 8. Responsive Layout

1. Validate on a desktop-width viewport.
2. Resize to tablet-width viewports.
3. Check search, weather, date/time, shortcuts, categories, and settings.

**Expected outcome**: Content reflows without overlap, clipped primary controls,
or inaccessible actions on desktop and tablet sizes.

**Validated**: PASS for desktop (1280px) and tablet (768px), the two widths
required by the constitution ("Responsive" principle: desktop primary,
tablet required, phone best-effort). `tests/e2e/responsive.spec.ts` and
`tests/e2e/accessibilityAndTheme.spec.ts` check for horizontal overflow, a
non-overlapping search bar/theme toggle pair, and an unclipped shortcut
grid at both widths. Phone-width layout was not validated (out of scope
per the constitution).

### 9. Configuration Recovery

1. Start with missing local preferences.
2. Start with partially invalid saved preferences.
3. Start with many shortcuts and categories.

**Expected outcome**: Missing or invalid preferences recover to a usable default
or repaired configuration. Many shortcuts and categories remain scannable and do
not break the layout.

**Validated**: PASS for missing/partially invalid preferences.
`tests/unit/configSchema.test.ts` covers an unrecognized version, missing
sections, an invalid shortcut, an orphaned `categoryId`, and a mixed
valid/invalid list, all repairing to a usable configuration.
`tests/unit/configStore.test.ts` covers unparsable JSON and storage access
failures. "Many shortcuts and categories remain scannable" was not
specifically load-tested with a large synthetic dataset; the responsive
grid (`repeat(auto-fill, minmax(...))`) and category filtering are designed
to scale, but this hasn't been verified beyond the small default dataset
used throughout the test suite.

## Completion Criteria

- All scenarios above pass.
- No unresolved constitution gate violations remain in [plan.md](./plan.md).
- No unresolved requirement clarification remains in [spec.md](./spec.md).

## Validation Summary (Polish phase, T059/T061)

All 9 scenarios pass. Full automated suite at time of writing: 76/76 unit +
integration tests (Vitest), 17/17 end-to-end tests (Playwright, Chromium),
clean production build, clean lint, zero uses of the TypeScript `any` type.

Two gaps surfaced during this validation pass and were fixed rather than
left as TODOs, since their underlying service logic already existed and was
already unit-tested but had never been wired into the UI:

- **Shortcut reordering (FR-008)**: `reorderShortcuts` (T039) had no UI.
  Added "Move up"/"Move down" controls to each shortcut card in management
  mode.
- **Category creation (FR-009, T042)**: `addCategory` (T040) had no UI —
  only the default "General" category existed. Added a "New category" field
  to `Settings`.

Known remaining gaps (not required by the spec's acceptance scenarios, left
for a future iteration rather than expanded in Polish):

- Category rename, hide, and reorder have no UI (only create/assign).
- Live weather ("available" status) is only verified via the pure
  `resolveWeatherSummary` unit tests, not against a real successful
  Geolocation + Open-Meteo fetch, since this environment has no browser
  location permission to grant.
- Large-dataset scannability (many shortcuts/categories) is a design intent
  (responsive auto-fill grid, category filtering) but hasn't been
  load-tested with synthetic data beyond the small default set.
- Phone-width layout is unvalidated, matching the constitution's
  "best-effort" scope for phone.
