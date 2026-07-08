# UI Contract: Personal Browser Dashboard

## Purpose

This contract defines externally visible dashboard behavior for the user. It is
the feature contract for a browser start page: what appears, how primary actions
behave, and what must remain true across reloads, failures, keyboard use, and
responsive viewports.

## Launch Contract

- On load, the dashboard presents search, current date/time, weather area, and
  shortcut access without unrelated content.
- Core local content is usable before external weather data is required.
- Invalid or missing local configuration falls back to a usable default state.
- The page contains no advertisements, recommendation feeds, notification
  streams, or unrelated content areas.

## Search Contract

- The search bar is a primary focusable control.
- Non-empty search submissions navigate to the configured search destination
  with the query included.
- Empty or whitespace-only submissions do not navigate and do not disrupt the
  dashboard.
- Search behavior uses the configured destination rather than a hardcoded
  provider.

## Date and Time Contract

- The dashboard displays the current date and time.
- The displayed date/time continues updating while the dashboard remains open.
- When the date changes across midnight, the visible date updates without a page
  reload.

## Weather Contract

- Weather displays current conditions when available.
- Weather loading or failure never blocks search, shortcuts, categories, theme,
  or settings.
- Weather unavailable states use calm, non-disruptive messaging.
- Missing weather location or permission produces a setup-needed or unavailable
  state, not a broken layout.

## Shortcuts and Categories Contract

- Each visible shortcut card has a readable label and opens its destination.
- The user can create, edit, remove, and reorder shortcuts.
- The user can assign shortcuts to categories.
- Categories support scanning or filtering shortcuts.
- Empty categories do not clutter the main dashboard.
- Saved shortcut and category changes remain after reload.
- Malformed shortcut input is rejected with the existing configuration preserved.

## Theme Contract

- The user can switch between light and dark theme behavior.
- The selected theme persists across reloads.
- The dashboard remains readable in both light and dark modes.

## Keyboard Navigation Contract

- Search, shortcut cards, category controls, theme controls, and preference
  controls are reachable by keyboard.
- Focus order follows the visual and task order of the dashboard.
- Focus states are visible.
- Primary actions can be completed without a pointer.

## Accessibility Contract

- Interactive controls expose accessible names.
- Informational regions such as weather and date/time are identifiable.
- Color alone is not required to understand state.
- Reduced-motion preferences minimize or disable nonessential motion.
- Text and controls retain sufficient readability in light and dark themes.

## Responsive Layout Contract

- Desktop layout is the primary dense layout.
- Tablet layout preserves access to search, status information, shortcuts,
  categories, and settings.
- Content must reflow without overlapping text, clipped primary controls, or
  hidden required actions.
- Phone layout may be best effort, but must not corrupt persisted configuration.

## Persistence Contract

- Theme, search preference, weather preference, shortcuts, and categories persist
  locally after changes.
- Reloading the dashboard restores the last valid saved preferences.
- Partially invalid saved data is repaired or ignored without preventing the
  dashboard from loading.
