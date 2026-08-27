# Feature Specification: Multiuser Authentication & Real Persistence

**Feature Branch**: `main`

**Created**: 2026-08-26

**Status**: Draft

**Input**: User description: "Multiuser authentication and real backend persistence for the dashboard. Currently the dashboard is a pure client-side SPA with a single DashboardConfiguration JSON blob persisted only to localStorage — no accounts, no backend, no server-side persistence, no Docker deployment artifacts exist yet. Goal: introduce real user accounts with hashed-password authentication, a persistent server-side session so a logged-in user is not asked to log in again after closing and reopening the browser, and per-user server-side persistence of the entire existing dashboard configuration — replacing localStorage as the source of truth. Must run in the user's homelab via Docker Compose, with data surviving `docker compose down && docker compose up -d`."

## Clarifications

### Session 2026-08-26

- Q: How long should a session keep a user logged in without re-authenticating? → A: Sliding session — stays valid indefinitely while used at least once every 30 days, capped at 90 days total even if used daily.
- Q: What should happen after repeated failed login attempts on one account? → A: After 10 failed attempts, lock the account for 15 minutes, then allow retrying.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configure once, keep it forever (Priority: P1)

A user logs into the dashboard with their account, personalizes it (widgets, shortcuts, categories, wallpaper, theme, notes, accessibility preferences), then closes the browser entirely. Days later they reopen the browser and visit the dashboard again.

**Why this priority**: This is the core value of the feature — without it, the dashboard is no better than today's localStorage-only behavior, just with an added login screen. This is the story that turns "personal, single-browser dashboard" into "personal, persistent, account-backed dashboard."

**Independent Test**: Can be fully tested by logging in as a single seeded user, changing several distinct settings, fully quitting the browser process (not just closing a tab), relaunching it, and confirming every changed setting is present with no login prompt shown.

**Acceptance Scenarios**:

1. **Given** a user has just logged in for the first time, **When** they change their theme, add a shortcut, rearrange widgets, and set a wallpaper, **Then** each change is reflected immediately in the interface.
2. **Given** a user made changes and then closed the browser completely, **When** they reopen the browser and navigate to the dashboard, **Then** they see their dashboard exactly as they left it, with no login form shown.
3. **Given** the dashboard is loading a returning user's session and configuration, **When** the check is still in progress, **Then** the user sees a clear loading state rather than a flash of an empty or default dashboard.
4. **Given** a user is dragging a widget to reorder it, **When** they move it across many positions in quick succession, **Then** the interface responds instantly and only a small number of save operations occur in the background (not one per intermediate position).

---

### User Story 2 - Log out and back in (Priority: P1)

A user who is done using the dashboard, or who is on a shared machine, explicitly logs out. Later, they (or someone else) opens the dashboard and must log in again to see any account's configuration.

**Why this priority**: Without a working, reliable logout, the "session persists" behavior of Story 1 becomes a security problem rather than a convenience. Both stories are needed together to consider authentication "real."

**Independent Test**: Can be fully tested by logging in, clicking logout, and confirming a login screen appears; then confirming no dashboard data or account state is visible in the browser without logging in again.

**Acceptance Scenarios**:

1. **Given** a logged-in user, **When** they choose "log out" from the dashboard, **Then** they are immediately shown the login screen and their previous dashboard content is no longer accessible.
2. **Given** a user has logged out, **When** they reload or revisit the dashboard, **Then** the login screen appears again — the previous session is not silently restored.
3. **Given** a user's session has expired or been invalidated (e.g. by an administrator, or by natural expiry), **When** they next interact with the dashboard, **Then** the app detects this, returns them to the login screen, and does not enter a redirect loop or show a broken/blank state.

---

### User Story 3 - Independent accounts (Priority: P1)

Two different people use the same dashboard deployment, each with their own account. Each configures their dashboard differently, and neither can see or affect the other's configuration.

**Why this priority**: "Multiuser" is a named goal of this feature — without verified isolation between accounts, the feature has not actually delivered multiuser support, only single-user support with a login screen in front of it.

**Independent Test**: Can be fully tested by creating two accounts, logging into each in turn (or in separate browser profiles), making different, conflicting changes to each (e.g. opposite themes, different shortcut sets), and confirming each account's dashboard reflects only its own changes.

**Acceptance Scenarios**:

1. **Given** two separate user accounts exist, **When** each logs in and configures their dashboard differently, **Then** each sees only their own configuration, both during the same session and after logging back in later.
2. **Given** user A is actively using the dashboard, **When** user B logs in from a different browser/session and changes their own settings, **Then** user A's dashboard and stored configuration are unaffected.

---

### User Story 4 - First-time migration of existing local settings (Priority: P2)

A person who already used the dashboard before this feature existed (with settings stored only in their browser) creates an account and logs in for the first time.

**Why this priority**: Protects existing users' work from being silently lost when the persistence model changes. Important for trust and adoption, but the dashboard is still usable and correct without it if a user is starting fresh (hence P2, not P1).

**Independent Test**: Can be fully tested by pre-seeding a browser with a local configuration (via the existing settings UI, before any account exists), then creating and logging into an account for the first time, and confirming the previously-local configuration now appears as the account's dashboard.

**Acceptance Scenarios**:

1. **Given** a browser has an existing local dashboard configuration and no account has ever saved configuration to the server, **When** the user logs in for the first time, **Then** their local configuration becomes their account's persisted configuration automatically, without requiring them to redo any setup.
2. **Given** an account already has a persisted configuration on the server, **When** the same or a different browser (with its own unrelated local configuration) logs into that account, **Then** the account's server-side configuration is used and the unrelated local browser data is never used to overwrite it.

---

### User Story 5 - Administrator manages accounts (Priority: P3)

The person who deploys the dashboard needs at least one account to exist from the very first launch, and needs to be able to create accounts for other people afterward.

**Why this priority**: Necessary for the feature to be usable at all on first deployment, but it's an infrequent, setup-time action rather than part of daily use, so it ranks below the stories that shape everyday behavior.

**Independent Test**: Can be fully tested by deploying the application fresh with administrator credentials supplied via configuration, confirming that account can log in immediately, and confirming that account can create a second, non-administrator account that can also log in.

**Acceptance Scenarios**:

1. **Given** a brand-new deployment with no accounts yet, **When** the application starts for the first time with administrator credentials supplied, **Then** an administrator account matching those credentials exists and can log in.
2. **Given** an administrator is logged in, **When** they create a new account for another person, **Then** that person can immediately log in with the credentials they were given.
3. **Given** a non-administrator account is logged in, **When** they attempt an administrator-only action, **Then** the action is refused.

### Edge Cases

- What happens when a user enters the wrong password repeatedly? After 10 consecutive failures, the system MUST lock that account for 15 minutes rather than allowing unlimited guessing.
- What happens if the server is temporarily unreachable while a user is actively making changes? Recent changes MUST NOT be silently discarded from the interface; the user's in-progress view keeps their edits, and saving is retried or clearly surfaced as failed rather than pretending to succeed.
- What happens if two browser tabs for the same account are open and both make changes? The most recently saved change is the one that persists; neither tab MUST crash or show corrupted data.
- What happens if the underlying data store (database file/volume) is missing or corrupted on startup? The application MUST fail to start (or clearly report the problem) rather than silently running with an empty, unrecoverable data store that a user might mistake for "no accounts yet."
- What happens when a user's local browser configuration (pre-migration) is malformed or corrupted? The same validation/repair behavior the dashboard already applies to local configuration MUST apply before anything is saved to the account — a corrupted local file must not corrupt the account's server-side configuration.
- What happens when an administrator tries to create an account with a username that already exists? The system MUST reject it with a clear reason, not silently overwrite the existing account.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow a person to authenticate using a username and password before any dashboard configuration is shown.
- **FR-002**: System MUST store passwords only in a securely hashed form; the original password MUST NOT be recoverable from stored data.
- **FR-003**: System MUST keep a user logged in across closing and reopening the browser, without requiring re-authentication, for as long as they return within 30 days of their last visit (sliding), up to a hard cap of 90 days from login even with continuous daily use — after either limit, System MUST require re-authentication.
- **FR-004**: System MUST provide an explicit "log out" action that ends the current session immediately and requires re-authentication for any further access.
- **FR-005**: System MUST detect an expired or invalidated session on the client and return the user to the login screen without entering a redirect loop or showing a broken dashboard state.
- **FR-006**: System MUST persist each user's complete dashboard configuration (theme, appearance, wallpaper, widget layout, shortcuts, categories, notes, monitoring source settings, accessibility/animation/glass preferences) on the server, associated with that user's account, replacing the browser's local storage as the source of truth.
- **FR-007**: System MUST keep each user's configuration fully independent — no user's actions may read or modify another user's configuration.
- **FR-008**: System MUST show an explicit loading state while checking for an existing session or loading a user's configuration, and MUST NOT show an empty or default dashboard before the real configuration has loaded.
- **FR-009**: System MUST batch or delay saving frequent, rapid configuration changes (such as dragging a widget) so that saving does not produce an excessive number of individual save operations, while still saving promptly enough that a closed browser does not lose the last change.
- **FR-010**: System MUST support at least two account roles — an administrator role and a standard user role.
- **FR-011**: System MUST allow at least one administrator account to be established automatically the first time the application is deployed, using credentials supplied through the deployment configuration rather than the application's user interface.
- **FR-012**: System MUST allow an administrator to create new user accounts; System MUST NOT allow self-service account creation by unauthenticated visitors.
- **FR-013**: System MUST reject an attempt to create an account with a username that is already in use, with a clear explanation.
- **FR-014**: System MUST lock an account from further login attempts for 15 minutes after 10 consecutive failed login attempts against it, to deter password guessing, then automatically allow attempts again.
- **FR-015**: System MUST validate all account-related and configuration-related input on the server, independent of any validation performed in the browser.
- **FR-016**: When a user logs in for the first time and their account has no configuration saved on the server yet, System MUST migrate that browser's existing local dashboard configuration (if any) to become the account's initial persisted configuration, applying the same validation/repair rules the dashboard already applies to local configuration.
- **FR-017**: System MUST NOT overwrite an account's already-existing server-side configuration with a browser's local configuration under any circumstance.
- **FR-018**: System MUST continue to work exactly as before (widgets, drag-and-drop, shortcuts, categories, search, command palette, theming) for an authenticated user, with the login requirement and remote persistence being the only user-visible additions.
- **FR-019**: System's authentication/session mechanism MUST NOT rely on browser local storage to hold any credential or session-proof value.
- **FR-020**: All data required for accounts, sessions, and dashboard configuration MUST survive a full stop-and-restart of the deployment (equivalent to `docker compose down` followed by `docker compose up -d`) without loss.

### Key Entities *(include if feature involves data)*

- **User Account**: Represents a person able to log in. Attributes include a unique username/identifier, a securely hashed password, a display name, a role (administrator or standard user), and creation/update timestamps. Does not store the plaintext password.
- **Session**: Represents one authenticated browser's ongoing login. Attributes include which account it belongs to, when it was created, when it was last active, when it expires, and enough information to invalidate it independently of other sessions for the same account.
- **Dashboard Configuration (per account)**: The existing dashboard configuration structure (theme, appearance, wallpaper, widget layout, shortcuts, categories, notes, monitoring settings, accessibility preferences), now associated with exactly one User Account rather than one browser. Its internal shape is unchanged by this feature.

### Constitution Alignment *(mandatory)*

- **Components**: A new login screen and an authentication "gate" wrapping the existing dashboard shell, built from the dashboard's existing visual component kit (glass panels/cards/buttons/inputs) rather than a new visual language; no existing dashboard component is redesigned.
- **Configuration**: Deployment-time settings (administrator bootstrap credentials, session lifetime, cookie security mode) live in typed, environment-driven configuration, never hardcoded; the shape of user-facing dashboard configuration is unchanged.
- **Performance**: Checking for a valid session and loading a user's configuration happens once, immediately at startup, before the dashboard renders — this is a deliberate, documented exception to "avoid blocking startup with nonessential network requests" (Principle III), justified because rendering the dashboard shell before the user's real configuration is known risks overwriting that configuration with defaults; the loading state is kept minimal so perceived startup time stays close to the one-second goal once cached.
- **Responsive Behavior**: The login screen and loading state follow the same desktop-first, tablet-adapting layout rules as the rest of the dashboard.
- **Clean UI**: The login screen is minimal — credentials and a submit action only, no marketing content, consistent with the dashboard's distraction-free direction.
- **Typing**: New account, session, and configuration-transport data are explicitly typed end-to-end (client and server); the `any` type is not introduced; the existing `DashboardConfiguration` type and its validation/repair logic are reused unchanged for the persisted payload.
- **Testability**: Authentication, session validation, account isolation, and configuration migration logic are implemented as business logic separate from UI rendering and covered by focused tests, consistent with how existing configuration parsing/validation is tested today.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A returning user who closes and reopens their browser within 30 days of their last visit (and within 90 days of their original login) sees their previously-configured dashboard restored with no login prompt, in 100% of trials.
- **SC-002**: After explicit logout, 100% of subsequent dashboard visits show the login screen until a successful login occurs.
- **SC-003**: Changes made by one account are never visible in, or able to alter, another account's dashboard — verified across all configuration areas (theme, shortcuts, categories, widgets, wallpaper, notes) in testing with at least two accounts.
- **SC-004**: A full stop-and-restart of the deployment preserves 100% of existing accounts, sessions not yet expired, and dashboard configurations.
- **SC-005**: A user with pre-existing local browser configuration who logs in for the first time sees that configuration preserved as their account's dashboard, with zero manual reconfiguration required.
- **SC-006**: Rapidly reordering or moving a widget for several seconds results in a small, bounded number of save operations (not one per intermediate visual position), with the final position always being the one persisted.
- **SC-007**: After 10 consecutive incorrect password attempts against one account, the account is locked for 15 minutes and no further attempt succeeds during that window; the account remains identifiable/recoverable by an administrator (i.e., the lockout is temporary and non-destructive) and login succeeds normally with correct credentials once the window elapses.
- **SC-008**: The loading state shown while session/configuration checks are in progress never exposes another account's data or a stale/default dashboard before the real configuration is ready.

## Assumptions

- Users authenticate with a username and password; no third-party/social login (OAuth/SSO) is in scope for this feature.
- No self-service account registration; all accounts are created by an administrator, with the first administrator account bootstrapped from deployment-time configuration.
- Password reset/change flows and a full user-management interface (listing, editing, deleting accounts beyond creation) are out of scope for this feature and may follow in a later feature.
- The dashboard is deployed as a single self-hosted instance (a homelab), not a multi-tenant SaaS product; "many users" means the small number of people the deployer invites, not public signup at scale.
- The existing `DashboardConfiguration` data shape and its client-side validation/repair behavior are correct and unchanged by this feature — this feature changes *where* that data lives (server-side, per account) and *how* it is protected (behind authentication), not *what* it contains.
- A user is assumed to use one account per browser profile at a time; using the same browser profile to rapidly switch between multiple accounts concurrently in multiple tabs is not a primary supported scenario, though it must not corrupt data (see Edge Cases).
- Existing local (pre-feature) browser configuration is only relevant for migration on a given account's very first login; once an account has any server-side configuration, local browser data is never consulted again for that account.
