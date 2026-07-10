# Tasks: Glassmorphism Widget Dashboard

**Input**: Design documents from `/specs/002-widget-dashboard/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md), [design-reference.md](./design-reference.md)

**Tests**: Included per the project constitution (business logic, configuration parsing, and service-status handling MUST have focused tests; UI tests are included for interaction/responsive behavior).

**Organization**: Tasks are grouped by user story (from spec.md: US1 and US2 are both P1, US3 is P2) to enable independent implementation and testing of each story. Shared architecture from the plan review (design tokens, Glass* family, WidgetRegistry, StorageProvider, layoutEngine, eventBus, the five state slices, AppShell) is Foundational — it blocks all three stories because none of them can render without it. `searchEngine`/`CommandPalette` wiring is Polish — it isn't required by any FR/user story on its own, it enhances stories already delivered.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are included in each description

## Path Conventions

React dashboard/start page structure (extension of `001-browser-dashboard`):
`src/design/`, `src/state/`, `src/components/`, `src/plugins/`, `src/config/`, `src/features/`, `src/services/`, `src/types/`, `src/utils/`, `tests/unit/`, `tests/integration/`, `tests/e2e/` — per [plan.md's Project Structure](./plan.md#project-structure).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project scaffolding for the new architecture layers

- [x] T001 Create new top-level directories per plan.md: `src/design/`, `src/state/`, `src/plugins/`, `src/services/storage/`, `src/components/glass/`, `src/components/shell/`, `src/components/widgets/`
- [x] T002 Add `lucide-react` and `simple-icons` as dependencies in `package.json` (tree-shakeable, per-icon imports only)
- [x] T003 [P] Confirm ESLint/TypeScript strict config (`eslint.config.js`, `tsconfig.json`) covers the new `src/design/`, `src/state/`, `src/plugins/` directories with the existing no-`any` rules
- [x] T004 [P] Create empty typed widget catalog stub at `src/config/widgets.ts` (exports `WIDGET_CATALOG: WidgetType[]`, filled in during Foundational)

**Checkpoint**: Directories and tooling ready for foundational work.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Design tokens, Glass* primitives, storage abstraction, widget registry, layout engine, event bus, and the five state slices — every user story needs these to render anything at all.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Design tokens

- [x] T005 [P] Define spacing tokens in `src/design/spacing.ts`
- [x] T006 [P] Define radius tokens in `src/design/radius.ts`
- [x] T007 [P] Define color tokens in `src/design/colors.ts`
- [x] T008 [P] Define motion tokens (durations/easings, reduced-motion variants) in `src/design/motion.ts`
- [x] T009 [P] Define glass tokens (blur/translucency/border presets: low/medium/high intensity, subtle/visible border) in `src/design/glass.ts`
- [x] T010 [P] Define breakpoint thresholds (desktop/tablet/phone) in `src/design/breakpoints.ts`
- [x] T011 [P] Define typography scale tokens in `src/design/typography.ts`
- [x] T012 [P] Define shadow/elevation tokens in `src/design/shadows.ts`
- [x] T013 [P] Define the stacking-order scale (base, drawer, palette, dropdown, tooltip, dialog) in `src/design/zIndex.ts`
- [x] T014 Aggregate all tokens into a single export in `src/design/tokens.ts` (depends on T005-T013)

### Glass* component family

- [x] T015 [P] Implement `GlassPanel` in `src/components/glass/GlassPanel/` reading tokens from `src/design/glass.ts`
- [x] T016 [P] Implement `GlassCard` in `src/components/glass/GlassCard/`
- [x] T017 [P] Implement `GlassButton` in `src/components/glass/GlassButton/`
- [x] T018 [P] Implement `GlassIconButton` in `src/components/glass/GlassIconButton/`
- [x] T019 [P] Implement `GlassInput` in `src/components/glass/GlassInput/`
- [x] T020 [P] Implement `GlassDialog` in `src/components/glass/GlassDialog/`, taking its stacking order from `src/design/zIndex.ts`
- [x] T021 [P] Implement `GlassTooltip` in `src/components/glass/GlassTooltip/`, taking its stacking order from `src/design/zIndex.ts`
- [x] T022 [P] Implement `GlassDropdown` in `src/components/glass/GlassDropdown/`, taking its stacking order from `src/design/zIndex.ts`
- [x] T023 [P] Implement `GlassBadge` in `src/components/glass/GlassBadge/`

### Storage abstraction

- [x] T024 Define the `StorageProvider` interface (`get`/`set`/`remove`) in `src/services/storage/StorageProvider.ts` per [contracts/storage-provider-contract.md](./contracts/storage-provider-contract.md)
- [x] T025 Implement `LocalStorageProvider` (wraps `window.localStorage`, in-memory fallback when unavailable) in `src/services/storage/LocalStorageProvider.ts` (depends on T024)
- [x] T026 [P] Unit test `LocalStorageProvider` get/set/remove and unavailable-storage fallback in `tests/unit/storageProvider.test.ts` (depends on T025)
- [x] T027 Refactor `src/services/configStore.ts` to depend on an injected `StorageProvider` (default `LocalStorageProvider`) instead of calling `localStorage` directly (depends on T025)

### Widget/layout/theme types and schema

- [x] T028 [P] Define `Widget`, `WidgetLayout`, `WidgetDescriptor`, `WidgetMetadata`, `ThemePreferences`, `BackgroundConfig`, `MonitoringSourceConfig`, `Note`, `IconSource` types in `src/types/widgets.ts` per [data-model.md](./data-model.md)
- [x] T029 [P] Define `Breakpoint` and `ResolvedLayout` types in `src/types/layout.ts`
- [x] T030 [P] Define the event-name → payload map type in `src/types/events.ts`
- [x] T031 Extend `src/config/schema.ts` with validation/repair for widget layout, theme-group, background, monitoring, and icon schemas (depends on T028)
- [x] T032 Extend `src/config/defaults.ts` with widget catalog defaults, default `WidgetLayout` (clock + shortcuts enabled), and default `ThemePreferences` (depends on T031)

### Widget registry, layout engine, event bus

- [x] T033 Implement `widgetRegistry` (`register`/`unregister`/`getMetadata`/`load`/`lazyLoad`, duplicate-registration handling) in `src/services/widgetRegistry.ts` (depends on T028)
- [x] T034 [P] Unit test `widgetRegistry` register/unregister/getMetadata/duplicate-registration/unknown-type lookups in `tests/unit/widgetRegistry.test.ts` (depends on T033)
- [x] T035 Implement `widgetLayout` service (enable/order persistence, validation/repair, never-fully-empty guarantee) in `src/services/widgetLayout.ts` (depends on T027, T032)
- [x] T036 [P] Unit test `widgetLayout` persistence and repair-on-corruption in `tests/unit/widgetLayout.test.ts` (depends on T035)
- [x] T037 Implement `layoutEngine` (`resolveLayout(widgetLayout, breakpoint, registry) -> ResolvedLayout`, `useBreakpoint()` hook) in `src/services/layoutEngine.ts` (depends on T029, T033, T035)
- [x] T038 [P] Unit test `layoutEngine.resolveLayout()` as a pure function across breakpoints in `tests/unit/layoutEngine.test.ts` (depends on T037)
- [x] T039 Implement `eventBus` (`emit`/`on`/`off`, typed payloads) in `src/services/eventBus.ts` (depends on T030)
- [x] T040 [P] Unit test `eventBus` emit/on/off and multiple-subscriber isolation in `tests/unit/eventBus.test.ts` (depends on T039)

### Theme and background

- [X] T041 Extend `src/services/theme.ts` to persist/read the `theme` and `appearance` `ThemePreferences` groups via `configStore` (depends on T027, T031)
- [X] T042 Implement `backgroundEngine` (source resolution, dim-overlay/blur/gradient computation) in `src/services/backgroundEngine.ts` (depends on T027, T031)
- [X] T043 [P] Unit test `backgroundEngine` source switching and overlay/blur/gradient computation, including fallback on invalid config, in `tests/unit/backgroundEngine.test.ts` (depends on T042)

### State slices (React Context)

- [X] T044 [P] Implement `ThemeProvider`/`useThemeState()` (all six `ThemePreferences` groups) in `src/state/ThemeProvider.tsx` (depends on T041, T042)
- [X] T045 [P] Implement `WorkspaceProvider`/`useWorkspaceState()` (persisted `WidgetLayout`, `ResolvedLayout`, ephemeral per-widget runtime state) in `src/state/WorkspaceProvider.tsx` (depends on T035, T037)
- [X] T046 [P] Implement `PluginProvider`/`usePluginState()` (registry snapshot) in `src/state/PluginProvider.tsx` (depends on T033)
- [X] T047 [P] Implement `SettingsProvider`/`useSettingsState()` (drawer open/section, ephemeral) in `src/state/SettingsProvider.tsx`
- [X] T048 [P] Implement `SearchProvider`/`useSearchState()` (query/results/palette open, ephemeral skeleton — no sources wired yet) in `src/state/SearchProvider.tsx`

### AppShell composition

- [X] T049 Implement `BackgroundLayer` (renders `ThemeState.wallpaper` via `backgroundEngine`) in `src/components/shell/BackgroundLayer/` (depends on T044)
- [X] T050 Implement `Workspace` + `LeftColumn`/`CenterColumn`/`RightColumn` (render `WorkspaceState.ResolvedLayout`, no layout math of their own) in `src/components/shell/Workspace/` (depends on T045, T046)
- [X] T051 Implement `SettingsDrawer` shell (closed by default, empty sections, reads/writes `SettingsState`) in `src/components/shell/SettingsDrawer/` (depends on T047)
- [X] T052 Implement `CommandPalette` shell (closed by default, keyboard toggle, focus trap, empty result list — sources wired in Polish) in `src/components/shell/CommandPalette/` (depends on T048)
- [X] T053 Implement `AppShell` composing the five state Providers (Theme/Workspace/Plugin/Settings/Search) plus `BackgroundLayer` + `Workspace` + `SettingsDrawer` + `CommandPalette` in `src/components/shell/AppShell/` (depends on T049-T052)
- [X] T054 Update `src/features/dashboard/Dashboard.tsx` to render `<AppShell>` instead of the previous fixed-section layout (depends on T053)
- [X] T055 Create `src/plugins/index.ts` with an empty `registerBuiltInPlugins()` entry point, called during app init before `AppShell` mounts (depends on T033, T054)

**Checkpoint**: Foundation ready — `AppShell` renders an empty, correctly-themed, responsive shell with zero widgets. All three user stories can now proceed.

---

## Phase 3: User Story 1 - Glanceable Widget Grid on Open (Priority: P1) 🎯 MVP

**Goal**: Opening the dashboard shows a populated, glassmorphism-styled widget grid (clock, weather, server status, Docker containers, calendar, notes, shortcuts) within the fast-load budget, with graceful loading/unavailable states and no layout shift.

**Independent Test**: Open the start page with a default widget configuration; verify clock, weather, and shortcuts widgets render populated data (or a graceful loading/fallback state) within the performance budget, without navigating anywhere else.

### Tests for User Story 1

- [X] T056 [P] [US1] Unit test `monitoring` service fetch/timeout/malformed-response handling per [contracts/monitoring-api-contract.md](./contracts/monitoring-api-contract.md) in `tests/unit/monitoring.test.ts`
- [X] T057 [P] [US1] Unit test `notes` persistence and content size-bounding in `tests/unit/notes.test.ts`
- [X] T058 [P] [US1] Integration test: default load renders clock/shortcuts immediately, other default widgets show `loading` then `ready`/`unavailable`, never a blank gap, in `tests/integration/WidgetGrid.test.tsx`
- [X] T059 [P] [US1] Integration test: dashboard renders correctly with zero optional widgets enabled (clock + shortcuts only, no empty layout artifacts) in `tests/integration/WidgetGrid.test.tsx`

### Implementation for User Story 1

- [X] T060 [P] [US1] Implement `monitoring` service (non-blocking fetch, timeout, per-contract response parsing) in `src/services/monitoring.ts`
- [X] T061 [P] [US1] Implement `notes` service (local persistence via `configStore`, size-bounded content) in `src/services/notes.ts`
- [X] T062 [P] [US1] Create `ClockWidget` in `src/components/widgets/ClockWidget/` and register it via `src/plugins/clock/plugin.ts`
- [X] T063 [P] [US1] Create `WeatherWidget` (wraps existing `WeatherSummary`, `loading`/`ready`/`unavailable` states) in `src/components/widgets/WeatherWidget/` and register via `src/plugins/weather/plugin.ts`
- [X] T064 [P] [US1] Create `ServerStatusWidget` (`loading`/`ready`/`unavailable`/`not-configured` states, consumes `monitoring`) in `src/components/widgets/ServerStatusWidget/` and register via `src/plugins/server-status/plugin.ts` (depends on T060)
- [X] T065 [P] [US1] Create `DockerStatusWidget` (same state contract, consumes `monitoring`) in `src/components/widgets/DockerStatusWidget/` and register via `src/plugins/docker-status/plugin.ts` (depends on T060)
- [X] T066 [P] [US1] Create `CalendarWidget` (local read-only month view, no external sync) in `src/components/widgets/CalendarWidget/` and register via `src/plugins/calendar/plugin.ts`
- [X] T067 [P] [US1] Create `NotesWidget` (consumes `notes` service) in `src/components/widgets/NotesWidget/` and register via `src/plugins/notes/plugin.ts` (depends on T061)
- [X] T068 [US1] Create `ShortcutsWidget` (composes existing `ShortcutCard`/`CategoryNav`; icon resolution comes in US3) in `src/components/widgets/ShortcutsWidget/` and register via `src/plugins/shortcuts/plugin.ts`
- [X] T069 [US1] Wire all 7 plugin modules into `registerBuiltInPlugins()` in `src/plugins/index.ts` (depends on T062-T068)
- [X] T070 [US1] Wrap every widget surface in `GlassPanel` and confirm each renders exactly one of `loading`/`ready`/`unavailable`/`not-configured` via the existing `StatusMessage` component (verification pass across T062-T068)
- [X] T071 [US1] Verify Scenario 1 of [quickstart.md](./quickstart.md) manually (fresh load, then offline reload) and confirm no blocking network call delays first paint

**Checkpoint**: User Story 1 is fully functional and independently testable — the dashboard opens with a populated, glassmorphism widget grid.

---

## Phase 4: User Story 2 - Customize Which Widgets Appear and Where (Priority: P1)

**Goal**: Users can enable/disable/reorder widgets and change the visual theme/wallpaper/glass/animation/accessibility preferences through a settings surface, with changes persisted and safe fallback on corrupted config.

**Independent Test**: From the settings surface, disable one widget and enable another (or reorder two widgets), reload the page, and confirm the dashboard reflects the new layout — with no code changes.

### Tests for User Story 2

- [X] T072 [P] [US2] Unit test `widgetLayout` enable/disable/reorder mutation and column-assignment validation in `tests/unit/widgetLayout.test.ts` (extends T036)
- [X] T073 [P] [US2] Integration test: `WidgetSettings` enable/disable/reorder controls update the dashboard and persist across reload in `tests/integration/WidgetSettings.test.tsx`
- [X] T074 [P] [US2] Integration test: switching a `ThemePreferences` group (e.g. `glass` intensity) updates all widgets and chrome consistently in `tests/integration/WidgetSettings.test.tsx`
- [X] T075 [P] [US2] Integration test: corrupted persisted `WidgetLayout` falls back to the default layout instead of failing to render in `tests/integration/WidgetGrid.test.tsx`

### Implementation for User Story 2

- [X] T076 [US2] Implement `WidgetSettings` (list every registered widget type, enable/disable toggle, column assignment, keyboard-operable move up/down reordering via `utils/keyboard.ts`) in `src/components/WidgetSettings/` (depends on T033, T037, T050)
- [X] T077 [US2] Compose `WidgetSettings` inside `SettingsDrawer` alongside the existing `Settings` component, with six distinct, independently editable theme-group sections (theme, appearance, wallpaper, glass, animations, accessibility) in `src/components/shell/SettingsDrawer/` (depends on T051, T076)
- [X] T078 [US2] Extend `ThemeToggle` to read/write `ThemeState`'s `theme` group in `src/components/ThemeToggle/` (depends on T044)
- [X] T079 [US2] Add wallpaper controls (source picker, blur, dim overlay, gradient) to `SettingsDrawer`'s `wallpaper` section, backed by `backgroundEngine` (depends on T042, T077)
- [X] T080 [US2] Add monitoring-source endpoint configuration (URL, poll interval, timeout) to `WidgetSettings` for the `server-status`/`docker-status` widget types (depends on T060, T076)
- [X] T081 [US2] Ensure every `WidgetSettings`/`SettingsDrawer` change persists immediately via `WorkspaceState`/`ThemeState` (no separate save step required, matching FR-005) (depends on T077)
- [X] T082 [US2] Verify Scenario 2 of [quickstart.md](./quickstart.md) manually (enable/disable/reorder, theme switch, corrupted-storage fallback)

**Checkpoint**: User Stories 1 AND 2 both work independently — the dashboard is fully customizable through settings.

---

## Phase 5: User Story 3 - Quick Access to External Business Applications (Priority: P2)

**Goal**: Shortcut widgets link out to external business tools (bakery ERP, POS, etc.) as pure, categorized navigation cards with auto-resolved icons — no business logic or data from those systems ever enters the dashboard.

**Independent Test**: Add a shortcut pointing to an external business application URL, confirm it renders as a card/link in the shortcuts widget, and confirm activating it navigates to that external system in a new context — with the dashboard itself performing no business-specific logic, validation, or data fetching related to that system.

### Tests for User Story 3

- [ ] T083 [P] [US3] Unit test `iconProvider` fallback chain order (Lucide → Simple Icons → custom SVG → favicon → fallback), caching, and CORS/timeout fallthrough per [contracts/icon-provider-contract.md](./contracts/icon-provider-contract.md) in `tests/unit/iconProvider.test.ts`
- [ ] T084 [P] [US3] Integration test: shortcut card renders only name/icon/category (no business data), grouped by category, and opens via standard navigation without dashboard-side network calls in `tests/integration/ShortcutsWidget.test.tsx`

### Implementation for User Story 3

- [ ] T085 [P] [US3] Implement `iconProvider` (Lucide/Simple Icons/custom SVG/favicon-discovery/fallback chain, resolved-icon caching) in `src/services/iconProvider.ts`
- [ ] T086 [US3] Extend the existing `Shortcut` type with the optional `icon: IconSource` field in `src/types/dashboard.ts` (depends on T028, T085)
- [ ] T087 [US3] Extend `ShortcutCard` to render the `iconProvider`-resolved icon (or fallback tile) with no layout difference by provider in `src/components/ShortcutCard/` (depends on T086)
- [ ] T088 [US3] Add icon resolution/re-check trigger to the shortcut editor inside `WidgetSettings`, only on explicit save (never during dashboard render) in `src/components/WidgetSettings/` (depends on T076, T085)
- [ ] T089 [US3] Confirm category grouping (`CategoryNav`) organizes business/dev/personal shortcuts visually within `ShortcutsWidget` (depends on T068)
- [ ] T090 [US3] Verify Scenario 3 and Scenario 4b of [quickstart.md](./quickstart.md) manually (business shortcut boundary check, icon auto-discovery, CORS-blocked fallback)

**Checkpoint**: All three user stories are independently functional. This is the full spec-scoped feature.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Unify `SearchBar`/`CommandPalette` behind `searchEngine` (per the architecture review), plus verification/hardening that spans multiple stories. Not required for any single user story to be complete.

- [ ] T091 [P] Implement `searchEngine` (`registerSource`/`query`, synchronous per-source matching, per-source failure isolation) in `src/services/searchEngine.ts`
- [ ] T092 [P] Unit test `searchEngine` source registration, ranking/merging, duplicate-id handling, and per-source failure isolation per [contracts/search-engine-contract.md](./contracts/search-engine-contract.md) in `tests/unit/searchEngine.test.ts` (depends on T091)
- [ ] T093 Register the existing web-search behavior from `src/services/search.ts` as a `"web"` `SearchSource` (depends on T091)
- [ ] T094 Register a jump-to-shortcut `SearchSource` from `src/services/shortcuts.ts` (depends on T091)
- [ ] T095 [P] Register static navigation `SearchSource`s (e.g. "Open Wallpaper Settings") in `AppShell`'s bootstrap, emitting `eventBus` events consumed by `SettingsState` (depends on T039, T047, T091)
- [ ] T096 Wire `SearchBar` to call `searchEngine.query(input, { kinds: ["web", "shortcut"] })`, preserving existing Enter-to-search behavior (depends on T093, T094)
- [ ] T097 Wire `CommandPalette` to call `searchEngine.query(input)` unscoped, reusing `utils/keyboard.ts` navigation, executing `onSelect()` (navigation or `eventBus` emit) (depends on T052, T095, T096)
- [ ] T098 [P] Integration test: `SearchBar` and `CommandPalette` return consistent results for the same query, and a command result opens the correct `SettingsDrawer` section via `eventBus` in `tests/integration/SearchAndCommandPalette.test.tsx` (depends on T097)
- [ ] T099 [P] e2e test: three-column desktop → tablet responsive reflow and reduced-motion behavior in `tests/e2e/responsive-widgets.spec.ts`
- [ ] T100 [P] TypeScript strictness audit confirming no new `any` across `src/design/`, `src/state/`, `src/plugins/`, and all new `src/services/`
- [ ] T101 Bundle/performance check: confirm disabled widgets are not downloaded (`WidgetRegistry.lazyLoad()` code-splitting) and initial dashboard usability stays under one second, per quickstart Scenario 4c
- [ ] T102 Run the full [quickstart.md](./quickstart.md) validation guide end to end (all 7 scenarios)
- [ ] T103 Code cleanup pass: remove any now-unused feature-001 fixed-section layout code superseded by `AppShell`/`Workspace`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories (nothing renders without design tokens, Glass*, StorageProvider, WidgetRegistry, layoutEngine, the five state slices, and AppShell).
- **User Stories (Phase 3-5)**: All depend on Foundational completion; independently testable and deliverable in priority order (US1 → US2 → US3), or in parallel if staffed.
- **Polish (Phase 6)**: Depends on US1-US3 being complete (searchEngine sources include the shortcut source built in US1/US3; the settings-navigation commands reference sections built in US2).

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Foundational. No dependency on US2/US3 — renders the default widget grid on its own.
- **User Story 2 (P1)**: Starts after Foundational. Edits the `WidgetLayout`/`ThemePreferences` that US1 renders, but is independently testable via direct config mutation + reload even before US1's widgets are visually polished.
- **User Story 3 (P2)**: Starts after Foundational. Extends the `ShortcutsWidget` built in US1 with icons; independently testable by adding a shortcut and checking its card contents/navigation.

### Within Each User Story

- Tests written and failing before implementation.
- Types/services before components/UI composition (e.g. `monitoring.ts` before `ServerStatusWidget`).
- Widget plugin components before wiring them into `registerBuiltInPlugins()`.
- Story complete and checkpoint-verified before moving to the next priority.

### Parallel Opportunities

- All `[P]` Setup tasks (T003-T004) run in parallel.
- All `[P]` Foundational tasks within the same subsection (e.g. T005-T013 design tokens, T015-T023 Glass* family, T044-T048 state slices) run in parallel — each touches a different file with no cross-dependency within the group.
- Once Foundational completes, US1/US2/US3 can be staffed in parallel by different contributors (each touches a distinct set of widget/settings/shortcut files).
- Within US1, all 7 widget-plugin tasks (T062-T068) run in parallel — different files, no cross-widget dependency.

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test monitoring service in tests/unit/monitoring.test.ts"
Task: "Unit test notes service in tests/unit/notes.test.ts"
Task: "Integration test default widget grid render in tests/integration/WidgetGrid.test.tsx"

# Launch all independent widget-plugin tasks for User Story 1 together:
Task: "Create ClockWidget + plugins/clock/plugin.ts"
Task: "Create WeatherWidget + plugins/weather/plugin.ts"
Task: "Create ServerStatusWidget + plugins/server-status/plugin.ts"
Task: "Create DockerStatusWidget + plugins/docker-status/plugin.ts"
Task: "Create CalendarWidget + plugins/calendar/plugin.ts"
Task: "Create NotesWidget + plugins/notes/plugin.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run quickstart Scenario 1 independently
5. Deploy/demo if ready — this is a fully populated, glassmorphism widget grid with no customization or icon system yet

### Incremental Delivery

1. Setup + Foundational → empty, correctly-themed `AppShell` shell.
2. Add User Story 1 → populated widget grid → **MVP**, demoable.
3. Add User Story 2 → full customization (widgets, theme, wallpaper) → demoable.
4. Add User Story 3 → shortcut icon system + business-boundary guarantees → demoable, spec-complete.
5. Polish → shared search/command engine, responsive/perf/typing hardening.

### Parallel Team Strategy

1. Team completes Setup + Foundational together (this phase is large — ~51 tasks — and genuinely blocks everything, so it's worth the whole team's focus first).
2. Once Foundational is done:
   - Developer A: User Story 1 (widget plugins)
   - Developer B: User Story 2 (settings surface)
   - Developer C: User Story 3 (icon system) — can start once `ShortcutsWidget` from US1 exists, or stub against the planned interface
3. Stories complete and integrate independently; Polish (shared search engine) picks up once all three land.

---

## Notes

- `[P]` tasks = different files, no dependencies on other incomplete tasks in the same batch.
- `[Story]` label maps a task to its user story for traceability back to spec.md.
- Foundational is unusually large for this feature because the architecture review (design tokens, Glass* family, WidgetRegistry, StorageProvider, layoutEngine, eventBus, five state slices, AppShell) is genuinely shared, blocking infrastructure — not speculative extra work per story.
- `searchEngine`/`CommandPalette` content is deliberately Polish, not a user story: no FR or acceptance scenario in spec.md requires it, so it must not gate MVP delivery.
- Verify tests fail before implementing.
- Commit after each task or logical group.
- Stop at any checkpoint to validate a story independently.
