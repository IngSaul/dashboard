# Tasks: Personal Browser Dashboard

**Input**: Design documents from `/specs/001-browser-dashboard/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ui-contract.md, quickstart.md

**Tests**: Focused tests are included because the specification requires testable
business logic, configuration recovery, weather fallback, theme persistence,
keyboard navigation, accessibility, and responsive behavior.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the React dashboard project structure, tooling, and test environment.

- [X] T001 Create Vite React TypeScript project entry files in package.json, index.html, src/main.tsx, and src/App.tsx
- [X] T002 Create source and test directories from the implementation plan in src/components/, src/config/, src/features/dashboard/, src/services/, src/types/, src/utils/, tests/unit/, tests/integration/, and tests/e2e/
- [X] T003 [P] Configure strict TypeScript settings with no `any` in tsconfig.json
- [X] T004 [P] Configure linting and formatting scripts for TypeScript and React in package.json and eslint.config.js
- [X] T005 [P] Configure unit and component test tooling in vitest.config.ts and tests/setup.ts
- [X] T006 [P] Configure browser-level validation tooling for e2e checks in playwright.config.ts
- [X] T007 [P] Create global app stylesheet with minimalist responsive foundations in src/index.css
- [X] T008 [P] Add shared test fixtures for browser storage and default dashboard data in tests/fixtures/dashboardConfig.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared typed data, configuration, persistence, layout, and validation used by all stories.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T009 Define dashboard domain types for configuration, shortcuts, categories, search, weather, and theme in src/types/dashboard.ts
- [X] T010 Define typed default dashboard configuration in src/config/defaults.ts
- [X] T011 Implement configuration validation and repair helpers in src/config/schema.ts
- [X] T012 [P] Implement date/time formatting helpers in src/utils/dateTime.ts
- [X] T013 [P] Implement URL and string validation helpers in src/utils/validation.ts
- [X] T014 [P] Implement keyboard navigation helper utilities in src/utils/keyboard.ts
- [X] T015 Implement local configuration persistence service in src/services/configStore.ts
- [X] T016 Implement dashboard composition shell in src/features/dashboard/Dashboard.tsx
- [X] T017 Implement root app integration for the dashboard in src/App.tsx
- [X] T018 Create shared empty/error/fallback UI component in src/components/StatusMessage/StatusMessage.tsx
- [X] T019 Create base responsive dashboard layout styles in src/features/dashboard/Dashboard.css
- [X] T020 [P] Add unit tests for configuration validation and recovery in tests/unit/configSchema.test.ts
- [X] T021 [P] Add unit tests for local persistence load/save/fallback behavior in tests/unit/configStore.test.ts

**Checkpoint**: Foundation ready; user story implementation can now begin in priority order or in parallel where capacity allows.

---

## Phase 3: User Story 1 - Start Productively From a New Tab (Priority: P1) MVP

**Goal**: Show a distraction-free start page with search, date/time, weather area, and visible shortcuts that remains useful even when weather is unavailable.

**Independent Test**: Open the dashboard and verify search, date/time, weather status, and shortcut cards are visible, usable, and free of unrelated content; submit a search; simulate weather failure.

### Tests for User Story 1

- [X] T022 [P] [US1] Add search behavior unit tests for non-empty and empty queries in tests/unit/search.test.ts
- [X] T023 [P] [US1] Add weather fallback unit tests for loading, available, unavailable, and disabled states in tests/unit/weather.test.ts
- [X] T024 [P] [US1] Add date/time update tests for initial render and midnight rollover in tests/unit/dateTime.test.ts
- [X] T025 [P] [US1] Add launch interaction test for search, date/time, weather fallback, and shortcut visibility in tests/integration/dashboardLaunch.test.tsx

### Implementation for User Story 1

- [ ] T026 [P] [US1] Implement configurable search query builder in src/services/search.ts
- [ ] T027 [P] [US1] Implement non-blocking weather summary service with unavailable fallback in src/services/weather.ts
- [ ] T028 [P] [US1] Create reusable SearchBar component in src/components/SearchBar/SearchBar.tsx
- [ ] T029 [P] [US1] Create reusable DateTime component in src/components/DateTime/DateTime.tsx
- [ ] T030 [P] [US1] Create reusable WeatherSummary component in src/components/WeatherSummary/WeatherSummary.tsx
- [ ] T031 [P] [US1] Create read-only ShortcutCard component for visible shortcuts in src/components/ShortcutCard/ShortcutCard.tsx
- [ ] T032 [US1] Compose search, date/time, weather, and shortcut card list in src/features/dashboard/Dashboard.tsx
- [ ] T033 [US1] Wire dashboard defaults so first launch renders useful content from src/config/defaults.ts
- [ ] T034 [US1] Add distraction-free visual styling for search, status, and shortcut grid in src/features/dashboard/Dashboard.css
- [ ] T035 [US1] Add e2e first-launch validation for one-second usable content and no unrelated content in tests/e2e/firstLaunch.spec.ts

**Checkpoint**: User Story 1 is independently functional and satisfies the MVP start-page flow.

---

## Phase 4: User Story 2 - Personalize Shortcuts and Categories (Priority: P2)

**Goal**: Let the user create, edit, remove, reorder, categorize, and persist shortcuts locally.

**Independent Test**: Add, edit, remove, reorder, and categorize shortcuts; reload the dashboard and verify the saved configuration remains.

### Tests for User Story 2

- [ ] T036 [P] [US2] Add shortcut CRUD and validation unit tests in tests/unit/shortcuts.test.ts
- [ ] T037 [P] [US2] Add category assignment and empty-category filtering unit tests in tests/unit/categories.test.ts
- [ ] T038 [P] [US2] Add personalization interaction test for add/edit/remove/reload persistence in tests/integration/shortcutPersonalization.test.tsx

### Implementation for User Story 2

- [ ] T039 [P] [US2] Implement shortcut mutation helpers for create, update, remove, and reorder in src/services/shortcuts.ts
- [ ] T040 [P] [US2] Implement category mutation and filtering helpers in src/services/categories.ts
- [ ] T041 [P] [US2] Create CategoryNav component for scanning and filtering shortcuts in src/components/CategoryNav/CategoryNav.tsx
- [ ] T042 [P] [US2] Create Settings component for editing shortcuts and categories in src/components/Settings/Settings.tsx
- [ ] T043 [US2] Extend ShortcutCard component with edit and remove actions in src/components/ShortcutCard/ShortcutCard.tsx
- [ ] T044 [US2] Integrate category filtering and settings editing flow in src/features/dashboard/Dashboard.tsx
- [ ] T045 [US2] Persist shortcut and category edits through configStore in src/services/configStore.ts
- [ ] T046 [US2] Add e2e personalization validation for shortcut/category persistence after reload in tests/e2e/personalization.spec.ts

**Checkpoint**: User Story 2 is independently testable after the foundation and preserves personalized shortcuts/categories across reloads.

---

## Phase 5: User Story 3 - Use the Dashboard Comfortably Across Modes and Devices (Priority: P3)

**Goal**: Support light/dark theme, keyboard navigation, accessibility, responsive desktop/tablet layout, and reduced-motion-aware animations.

**Independent Test**: Toggle theme, reload, navigate all primary controls with keyboard, inspect accessibility labels, resize to tablet widths, and verify no overlap or inaccessible actions.

### Tests for User Story 3

- [ ] T047 [P] [US3] Add theme preference unit tests for light, dark, system, and persistence in tests/unit/theme.test.ts
- [ ] T048 [P] [US3] Add keyboard navigation integration test for search, categories, shortcuts, theme, and settings in tests/integration/keyboardNavigation.test.tsx
- [ ] T049 [P] [US3] Add accessibility interaction test for labels, focus states, and reduced motion in tests/integration/accessibility.test.tsx
- [ ] T050 [P] [US3] Add responsive layout e2e checks for desktop and tablet widths in tests/e2e/responsive.spec.ts

### Implementation for User Story 3

- [ ] T051 [P] [US3] Implement theme preference helpers in src/services/theme.ts
- [ ] T052 [P] [US3] Create ThemeToggle component in src/components/ThemeToggle/ThemeToggle.tsx
- [ ] T053 [US3] Integrate theme persistence and resolved theme state in src/features/dashboard/Dashboard.tsx
- [ ] T054 [US3] Add accessible names, landmarks, and focus management across src/components/SearchBar/SearchBar.tsx, src/components/ShortcutCard/ShortcutCard.tsx, src/components/CategoryNav/CategoryNav.tsx, src/components/ThemeToggle/ThemeToggle.tsx, and src/components/Settings/Settings.tsx
- [ ] T055 [US3] Add reduced-motion-aware animations and responsive desktop/tablet styles in src/index.css and src/features/dashboard/Dashboard.css
- [ ] T056 [US3] Add e2e keyboard, accessibility, theme reload, and tablet layout validation in tests/e2e/accessibilityAndTheme.spec.ts

**Checkpoint**: User Story 3 completes comfort, accessibility, theme, and responsive requirements without breaking prior stories.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation, and cleanup across all stories.

- [ ] T057 [P] Update project README with setup, run, build, and new-tab usage guidance in README.md
- [ ] T058 [P] Add quickstart validation notes and expected commands to specs/001-browser-dashboard/quickstart.md
- [ ] T059 Run full unit, integration, and e2e test suite and record fixes in tests/
- [ ] T060 Run production build and verify no TypeScript `any` or lint violations in src/ and tests/
- [ ] T061 Validate quickstart scenarios 1-9 manually or with e2e coverage and update specs/001-browser-dashboard/quickstart.md
- [ ] T062 Review UI density, animation restraint, and absence of ads/feed content across src/features/dashboard/Dashboard.tsx and src/features/dashboard/Dashboard.css

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion; blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational completion; MVP scope.
- **User Story 2 (Phase 4)**: Depends on Foundational completion and integrates with US1 shortcut display components.
- **User Story 3 (Phase 5)**: Depends on Foundational completion and applies accessibility/theme/responsive behavior across US1 and US2 components.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **US1**: Independent after foundation and should be delivered first as MVP.
- **US2**: Can begin after foundation, but final integration expects US1 shortcut rendering.
- **US3**: Can begin after foundation for theme helpers, but final validation applies to US1/US2 surfaces.

### Within Each User Story

- Write tests first and confirm they fail for the targeted behavior.
- Implement types/config or service logic before UI composition.
- Implement reusable components before dashboard composition.
- Validate the story independently before starting the next priority story.

---

## Parallel Opportunities

- T003-T008 can run in parallel after T001-T002 because they touch separate tooling and fixture files.
- T012-T014 and T018-T019 can run in parallel after shared types and defaults are defined.
- US1 tests T022-T025 can run in parallel.
- US1 components T028-T031 can run in parallel after shared types exist.
- US2 tests T036-T038 can run in parallel.
- US2 helpers/components T039-T042 can run in parallel after foundation.
- US3 tests T047-T050 can run in parallel.
- US3 theme component work T051-T052 can run in parallel before integration.
- Polish documentation tasks T057-T058 can run in parallel with final validation preparation.

## Parallel Example: User Story 1

```bash
Task: "T022 [P] [US1] Add search behavior unit tests for non-empty and empty queries in tests/unit/search.test.ts"
Task: "T023 [P] [US1] Add weather fallback unit tests for loading, available, unavailable, and disabled states in tests/unit/weather.test.ts"
Task: "T024 [P] [US1] Add date/time update tests for initial render and midnight rollover in tests/unit/dateTime.test.ts"
Task: "T028 [P] [US1] Create reusable SearchBar component in src/components/SearchBar/SearchBar.tsx"
Task: "T029 [P] [US1] Create reusable DateTime component in src/components/DateTime/DateTime.tsx"
Task: "T030 [P] [US1] Create reusable WeatherSummary component in src/components/WeatherSummary/WeatherSummary.tsx"
```

## Parallel Example: User Story 2

```bash
Task: "T036 [P] [US2] Add shortcut CRUD and validation unit tests in tests/unit/shortcuts.test.ts"
Task: "T037 [P] [US2] Add category assignment and empty-category filtering unit tests in tests/unit/categories.test.ts"
Task: "T039 [P] [US2] Implement shortcut mutation helpers for create, update, remove, and reorder in src/services/shortcuts.ts"
Task: "T040 [P] [US2] Implement category mutation and filtering helpers in src/services/categories.ts"
Task: "T041 [P] [US2] Create CategoryNav component for scanning and filtering shortcuts in src/components/CategoryNav/CategoryNav.tsx"
```

## Parallel Example: User Story 3

```bash
Task: "T047 [P] [US3] Add theme preference unit tests for light, dark, system, and persistence in tests/unit/theme.test.ts"
Task: "T048 [P] [US3] Add keyboard navigation integration test for search, categories, shortcuts, theme, and settings in tests/integration/keyboardNavigation.test.tsx"
Task: "T049 [P] [US3] Add accessibility interaction test for labels, focus states, and reduced motion in tests/integration/accessibility.test.tsx"
Task: "T050 [P] [US3] Add responsive layout e2e checks for desktop and tablet widths in tests/e2e/responsive.spec.ts"
Task: "T051 [P] [US3] Implement theme preference helpers in src/services/theme.ts"
Task: "T052 [P] [US3] Create ThemeToggle component in src/components/ThemeToggle/ThemeToggle.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Stop and validate the first-launch quickstart scenario, search, date/time, weather fallback, and shortcut visibility.
5. Build/demo when the MVP is stable.

### Incremental Delivery

1. Deliver US1 for a usable new-tab replacement.
2. Add US2 for personalization and local persistence.
3. Add US3 for theme, accessibility, keyboard navigation, responsive layout, and reduced-motion support.
4. Run Phase 6 polish and full quickstart validation.

### Task Count Summary

- Setup: 8 tasks
- Foundational: 13 tasks
- US1: 14 tasks
- US2: 11 tasks
- US3: 10 tasks
- Polish: 6 tasks
- Total: 62 tasks

## Notes

- All task descriptions include explicit target paths.
- Story tasks include [US1], [US2], or [US3] labels.
- Tests precede implementation within each story.
- The suggested MVP scope is Phase 1 + Phase 2 + Phase 3.
