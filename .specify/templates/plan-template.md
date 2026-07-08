# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., TypeScript 5.x, Python 3.11, Swift 5.9 or NEEDS CLARIFICATION]

**Primary Dependencies**: [e.g., React, Vite, FastAPI, UIKit or NEEDS CLARIFICATION]

**Storage**: [configuration files/modules, local storage, external APIs, database, or N/A]

**Testing**: [e.g., Vitest, React Testing Library, Playwright, pytest or NEEDS CLARIFICATION]

**Target Platform**: [e.g., desktop browser, tablet browser, Linux server or NEEDS CLARIFICATION]

**Project Type**: [e.g., React start page, web-service, library, mobile app or NEEDS CLARIFICATION]

**Performance Goals**: [e.g., initial dashboard usable in <1s, 60 fps interactions or NEEDS CLARIFICATION]

**Constraints**: [e.g., no `any`, config-driven shortcuts, desktop/tablet responsive or NEEDS CLARIFICATION]

**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Component First**: Identify reusable React components, prop contracts, and
  existing components to compose.
- **Configuration Driven**: Identify typed configuration files/modules for
  shortcuts, categories, service links, and preferences; no hardcoded personal
  data in components.
- **Fast**: Explain startup impact and how the feature preserves the <1s usable
  initial load goal.
- **Responsive**: Define desktop and tablet layout behavior, including expected
  breakpoints and non-overlap constraints.
- **Clean UI**: Confirm minimalist, advertisement-free, high-density UI with no
  unnecessary animation.
- **Strong Typing**: Confirm TypeScript types for props, config, domain data, and
  service responses; no new `any`.
- **Testable**: Confirm business logic is separate from UI and list focused
  tests for changed logic, config parsing, or service-status handling.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: React dashboard/start page
src/
├── components/
├── config/
├── features/
├── services/
├── types/
└── utils/

tests/
├── integration/
├── unit/
└── e2e/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── src/

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
