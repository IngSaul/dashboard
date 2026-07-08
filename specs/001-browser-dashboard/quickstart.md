# Quickstart: Personal Browser Dashboard

## Prerequisites

- Project dependencies installed.
- A browser available for manual or automated validation.
- A production build command and local preview command defined during
  implementation.

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

### 2. Search

1. Enter a normal search query.
2. Submit the query.
3. Return to the dashboard.
4. Submit an empty or whitespace-only query.

**Expected outcome**: The normal query opens the configured search destination.
The empty query does not navigate and does not disrupt the dashboard.

### 3. Shortcut Personalization

1. Add a shortcut with a label, destination, and category.
2. Edit the shortcut label or destination.
3. Reorder the shortcut.
4. Reload the dashboard.
5. Remove the shortcut and reload again.

**Expected outcome**: Shortcut changes persist across reloads, invalid input is
rejected without losing saved data, and removed shortcuts stay removed.

### 4. Category Behavior

1. Create at least two categories.
2. Assign shortcuts to each category.
3. Use the category controls to scan or filter shortcuts.
4. Leave one category empty.

**Expected outcome**: Category controls make shortcuts easier to scan, assigned
shortcuts appear in the right groups, and empty categories do not clutter the
main dashboard.

### 5. Weather Fallback

1. Validate the dashboard with weather available.
2. Simulate unavailable weather data or no network.
3. Reload the dashboard.

**Expected outcome**: Weather shows available conditions when possible. When it
cannot load, it shows a calm unavailable state and all non-weather features still
work.

### 6. Theme Persistence

1. Switch to dark theme.
2. Reload the dashboard.
3. Switch to light theme.
4. Reload the dashboard.

**Expected outcome**: The selected theme is restored after reload and the
dashboard remains readable in both themes.

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

### 8. Responsive Layout

1. Validate on a desktop-width viewport.
2. Resize to tablet-width viewports.
3. Check search, weather, date/time, shortcuts, categories, and settings.

**Expected outcome**: Content reflows without overlap, clipped primary controls,
or inaccessible actions on desktop and tablet sizes.

### 9. Configuration Recovery

1. Start with missing local preferences.
2. Start with partially invalid saved preferences.
3. Start with many shortcuts and categories.

**Expected outcome**: Missing or invalid preferences recover to a usable default
or repaired configuration. Many shortcuts and categories remain scannable and do
not break the layout.

## Completion Criteria

- All scenarios above pass.
- No unresolved constitution gate violations remain in [plan.md](./plan.md).
- No unresolved requirement clarification remains in [spec.md](./spec.md).
