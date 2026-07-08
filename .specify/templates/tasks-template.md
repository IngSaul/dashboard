---

description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Include focused tests for changed business logic, configuration
parsing, data normalization, and service-status handling. UI tests are included
when user interactions or responsive behavior change.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- **React dashboard/start page**: `src/components/`, `src/config/`,
  `src/features/`, `src/services/`, `src/types/`, `tests/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume single project - adjust based on plan.md structure

<!--
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.

  The /speckit-tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/

  Tasks MUST be organized by user story so each story can be:
  - Implemented independently
  - Tested independently
  - Delivered as an MVP increment

  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project structure per implementation plan
- [ ] T002 Initialize [language] project with [framework] dependencies
- [ ] T003 [P] Configure linting, formatting, and strict TypeScript checks
- [ ] T004 [P] Establish typed configuration location for shortcuts, categories, services, and preferences

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

Examples of foundational tasks (adjust based on your project):

- [ ] T005 Setup data/config schema and validation approach
- [ ] T006 [P] Implement shared service-status or external-data boundary
- [ ] T007 [P] Setup routing/layout shell if the feature needs navigation
- [ ] T008 Create base types/entities that all stories depend on
- [ ] T009 Configure error handling and graceful fallback infrastructure
- [ ] T010 Setup environment configuration management
- [ ] T011 Define shared React component boundaries and prop types
- [ ] T012 Add performance measurement or bundle/startup validation for the dashboard

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T013 [P] [US1] Unit test for [business/config logic] in tests/unit/[name].test.ts
- [ ] T014 [P] [US1] Interaction or integration test for [user journey] in tests/integration/[name].test.tsx

### Implementation for User Story 1

- [ ] T015 [P] [US1] Define TypeScript types for [domain/config data] in src/types/[name].ts
- [ ] T016 [P] [US1] Add or update typed configuration in src/config/[name].ts
- [ ] T017 [P] [US1] Create reusable component in src/components/[Component].tsx
- [ ] T018 [US1] Implement [feature logic/service] in src/services/[service].ts
- [ ] T019 [US1] Compose feature UI in src/features/[feature]/[Feature].tsx
- [ ] T020 [US1] Add validation and graceful error/empty states
- [ ] T021 [US1] Verify desktop and tablet responsive layout for this story

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 2

- [ ] T022 [P] [US2] Unit test for [business/config logic] in tests/unit/[name].test.ts
- [ ] T023 [P] [US2] Interaction or integration test for [user journey] in tests/integration/[name].test.tsx

### Implementation for User Story 2

- [ ] T024 [P] [US2] Define or extend TypeScript types in src/types/[name].ts
- [ ] T025 [US2] Add or update typed configuration in src/config/[name].ts
- [ ] T026 [US2] Implement reusable component or compose existing components in src/components/[Component].tsx
- [ ] T027 [US2] Implement [feature logic/service] in src/services/[service].ts
- [ ] T028 [US2] Integrate with User Story 1 components (if needed)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - [Title] (Priority: P3)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 3

- [ ] T029 [P] [US3] Unit test for [business/config logic] in tests/unit/[name].test.ts
- [ ] T030 [P] [US3] Interaction or integration test for [user journey] in tests/integration/[name].test.tsx

### Implementation for User Story 3

- [ ] T031 [P] [US3] Define or extend TypeScript types in src/types/[name].ts
- [ ] T032 [US3] Add or update typed configuration in src/config/[name].ts
- [ ] T033 [US3] Implement reusable component or compose existing components in src/components/[Component].tsx
- [ ] T034 [US3] Implement [feature logic/service] in src/services/[service].ts

**Checkpoint**: All user stories should now be independently functional

---

[Add more user story phases as needed, following the same pattern]

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] TXXX [P] Documentation updates in docs/
- [ ] TXXX Code cleanup and refactoring
- [ ] TXXX Performance optimization to preserve <1s initial dashboard usability
- [ ] TXXX [P] Additional unit tests for changed business logic and config parsing in tests/unit/
- [ ] TXXX [P] Responsive desktop/tablet layout verification
- [ ] TXXX [P] TypeScript strictness audit confirming no new `any`
- [ ] TXXX Security hardening
- [ ] TXXX Run quickstart.md validation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- Tests for changed business logic/config MUST be written and FAIL before implementation
- Types and configuration before services
- Business logic/services before UI composition
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Type/config/component tasks within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test for [business/config logic] in tests/unit/[name].test.ts"
Task: "Interaction or integration test for [user journey] in tests/integration/[name].test.tsx"

# Launch independent implementation tasks for User Story 1 together:
Task: "Define TypeScript types for [domain/config data] in src/types/[name].ts"
Task: "Create reusable component in src/components/[Component].tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
