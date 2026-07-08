# Data Model: Personal Browser Dashboard

## Overview

The dashboard stores a typed local configuration made from defaults plus the
user's saved preferences. All persisted values are validated before use. Invalid
or missing values fall back to safe defaults while preserving valid portions of
the configuration where possible.

## Entities

### Dashboard Configuration

Represents the full local state needed to render and personalize the dashboard.

**Fields**:

- `version`: configuration schema version.
- `themePreference`: selected theme behavior.
- `searchPreference`: configured search destination and query behavior.
- `weatherPreference`: location and display preference for weather.
- `shortcuts`: ordered list of shortcut records.
- `categories`: ordered list of shortcut category records.
- `updatedAt`: timestamp for the last saved preference change.

**Relationships**:

- Contains many `Shortcut` records.
- Contains many `Shortcut Category` records.
- References one `Theme Preference`.
- References one weather preference used to produce a `Weather Summary`.

**Validation rules**:

- `version` must be recognized or migratable.
- `shortcuts` must contain valid shortcut records only.
- `categories` must contain valid category records only.
- Missing optional groups fall back to defaults.
- Invalid individual records are ignored or repaired without blocking the page.

### Shortcut

A quick-access item displayed as a card.

**Fields**:

- `id`: stable unique identifier.
- `label`: user-visible name.
- `url`: destination to open.
- `categoryId`: optional category assignment.
- `description`: optional short helper text.
- `icon`: optional visual identifier.
- `order`: numeric display order.
- `createdAt`: timestamp when created.
- `updatedAt`: timestamp when last changed.

**Relationships**:

- May reference one `Shortcut Category` by `categoryId`.

**Validation rules**:

- `id` must be unique.
- `label` must be present after trimming whitespace.
- `url` must be a valid destination.
- `categoryId`, when present, must match an existing category or be cleared.
- `order` must resolve to a deterministic display order.

### Shortcut Category

A named grouping used to scan or filter shortcuts.

**Fields**:

- `id`: stable unique identifier.
- `name`: user-visible category name.
- `order`: numeric display order.
- `isVisible`: whether the category appears in navigation.
- `createdAt`: timestamp when created.
- `updatedAt`: timestamp when last changed.

**Relationships**:

- Can be referenced by many shortcuts.

**Validation rules**:

- `id` must be unique.
- `name` must be present after trimming whitespace.
- Duplicate names may be allowed only if identifiers remain distinct; generated
  displays should keep them understandable.
- Empty categories may exist but must not create clutter in the main dashboard.

### Search Preference

Defines where global search queries are sent.

**Fields**:

- `providerName`: user-visible provider label.
- `searchUrlTemplate`: destination template containing a query placeholder.
- `openBehavior`: whether searches open in the current tab or a new tab.

**Validation rules**:

- `searchUrlTemplate` must include a query placeholder.
- Empty or whitespace-only queries must not trigger navigation.
- Query text must be encoded before navigation.

### Weather Preference

Defines how current weather is resolved.

**Fields**:

- `mode`: configured location or browser-provided location.
- `locationLabel`: user-visible location label when configured.
- `units`: preferred temperature unit.
- `enabled`: whether weather is displayed.

**Validation rules**:

- Disabled weather renders no blocking requirement.
- Configured locations must include enough information to request current
  conditions.
- Missing location falls back to an unavailable or setup-needed weather state.

### Weather Summary

Represents current weather shown on the dashboard.

**Fields**:

- `status`: `loading`, `available`, `unavailable`, or `disabled`.
- `locationLabel`: user-visible location label.
- `temperature`: current temperature when available.
- `condition`: short condition text when available.
- `observedAt`: timestamp for the reported condition.
- `message`: calm user-facing fallback message for non-available states.

**Validation rules**:

- `available` status requires location label, temperature, condition, and
  observation timestamp.
- Non-available statuses must not block search, shortcuts, theme, or settings.

### Theme Preference

Stores the current visual mode.

**Fields**:

- `mode`: `light`, `dark`, or `system`.
- `resolvedMode`: active light or dark mode after applying system preference.

**Validation rules**:

- Unknown modes fall back to `system`.
- Theme changes persist for the next dashboard session.

## State Transitions

### Configuration Lifecycle

1. `defaulted`: dashboard uses bundled default configuration.
2. `hydrating`: persisted local configuration is read.
3. `validated`: persisted data is accepted, repaired, or partially discarded.
4. `active`: dashboard renders from validated configuration.
5. `saving`: user changes are persisted.
6. `recovered`: invalid persisted data was repaired or replaced with defaults.

### Weather Lifecycle

1. `disabled`: weather preference is off.
2. `loading`: weather is requested after dashboard core content is usable.
3. `available`: current weather is displayed.
4. `unavailable`: weather request failed, timed out, or lacked required data.

### Shortcut Editing Lifecycle

1. `viewing`: shortcuts are displayed.
2. `editing`: user creates or modifies a shortcut.
3. `validating`: shortcut fields are checked.
4. `saved`: shortcut is persisted and displayed.
5. `rejected`: invalid input is reported without losing existing configuration.
