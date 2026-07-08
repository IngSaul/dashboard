<!--
Sync Impact Report
Version change: unratified template -> 1.0.0
Modified principles:
- Template principle 1 -> I. Component First
- Template principle 2 -> II. Configuration Driven
- Template principle 3 -> III. Fast
- Template principle 4 -> IV. Responsive
- Template principle 5 -> V. Clean UI
- Added VI. Strong Typing
- Added VII. Testable
Added sections:
- Product Constraints
- Development Workflow & Quality Gates
Removed sections:
- None
Templates requiring updates:
- ✅ .specify/templates/plan-template.md
- ✅ .specify/templates/spec-template.md
- ✅ .specify/templates/tasks-template.md
- ✅ .specify/templates/commands/*.md (not present)
Follow-up TODOs:
- None
-->
# Dashboard Constitution

## Core Principles

### I. Component First
Every feature MUST be implemented as reusable React components with clear
props, typed data boundaries, and focused responsibility. Feature code MUST
prefer composition of existing components before introducing new UI patterns.
Rationale: a personal dashboard grows through many small widgets, and reusable
components keep daily-use features consistent and easy to extend.

### II. Configuration Driven
Shortcuts, categories, service links, widget preferences, and personal display
settings MUST live in typed configuration files or typed configuration modules.
Feature behavior MUST NOT hardcode personal services or categories inside
components. Rationale: the dashboard is personal software, so changing daily
links and preferences must be low-risk and independent from UI implementation.

### III. Fast
The initial page load MUST become usable in under one second on the target
personal browser environment using a production build. Features MUST avoid
blocking startup with nonessential network requests, large bundles, or
synchronous work. Rationale: a browser start page is opened repeatedly, and
latency directly reduces its usefulness.

### IV. Responsive
The interface MUST be designed desktop first and MUST adapt correctly to tablet
viewports without overlapping content, broken layouts, or inaccessible controls.
Phone layouts MAY be best effort unless a feature explicitly requires them.
Rationale: the primary use is desktop productivity, while tablet support keeps
the dashboard reliable across common personal devices.

### V. Clean UI
The interface MUST remain minimalist, distraction-free, dense enough for quick
scanning, and free of advertisements or decorative animation that does not help
the task. Motion, color, and imagery MUST be restrained and purposeful.
Rationale: the dashboard is a daily productivity surface, not a marketing page
or entertainment feed.

### VI. Strong Typing
All application code MUST be written with TypeScript types that describe
component props, configuration schemas, domain data, and service responses.
The `any` type MUST NOT be introduced. Existing untyped boundaries MUST be
wrapped with explicit validation or narrow types before use. Rationale: strong
typing protects personal configuration changes from silently breaking the start
page.

### VII. Testable
Business logic, configuration parsing, data normalization, and service-status
handling MUST be separated from UI rendering and covered by focused tests when
changed. Components MUST keep side effects at clear boundaries so they can be
tested or exercised independently. Rationale: daily-use reliability depends on
being able to verify behavior without fragile manual browser checks.

## Product Constraints

Dashboard is a personal browser start page focused on productivity. It provides
quick access to frequently used services, useful information such as weather
and server status, and a clean interface for daily use and learning.

Features MUST preserve the start-page role: fast access, glanceable status, and
low distraction take priority over broad application complexity. External data
sources MUST degrade gracefully when unavailable so the dashboard remains useful
offline or during service failures.

## Development Workflow & Quality Gates

Every feature plan MUST pass a constitution check before implementation:

- Reusable React component boundaries are identified.
- Required configuration changes and typed schemas are documented.
- Startup performance impact is considered and kept within the one-second goal.
- Desktop and tablet layout behavior is specified.
- UI changes preserve the minimalist, high-density visual direction.
- TypeScript types avoid `any` and cover new data boundaries.
- Business logic remains separate from UI and has focused tests where changed.

Implementation tasks MUST include validation for configuration, typing,
performance-sensitive paths, and responsive layout when relevant. Any deliberate
exception to a principle MUST be recorded in the feature plan with a narrower
alternative considered and a follow-up path.

## Governance

This constitution supersedes conflicting project practices and templates. All
specs, plans, tasks, and implementation reviews MUST check compliance with the
Core Principles and Product Constraints.

Amendments require an explicit update to this file, a Sync Impact Report, and
updates to affected templates or guidance documents in the same change. Version
changes follow semantic versioning:

- MAJOR for removing or redefining principles in a way that invalidates prior
  compliant work.
- MINOR for adding principles, sections, or materially expanding governance.
- PATCH for clarifications, wording improvements, and non-semantic fixes.

Compliance is reviewed during planning, before implementation tasks are
generated, and before a feature is considered complete. If a feature cannot
meet a principle, the plan MUST document the violation, why it is necessary,
and the smallest acceptable follow-up.

**Version**: 1.0.0 | **Ratified**: 2026-07-08 | **Last Amended**: 2026-07-08
