import { DASHBOARD_CONFIG_STORAGE_KEY } from '../../src/services/configStore'
import { defaultStorageProvider } from '../../src/services/storage/LocalStorageProvider'
import type {
  DashboardConfiguration,
  Shortcut,
  ShortcutCategory,
} from '../../src/types/dashboard'

/** Shared test fixtures for dashboard configuration and browser storage. */

/** localStorage key used by tests to seed/inspect persisted configuration. */
export const DASHBOARD_STORAGE_KEY = DASHBOARD_CONFIG_STORAGE_KEY

const FIXED_TIMESTAMP = '2026-07-08T09:00:00.000Z'

export const workCategoryFixture: ShortcutCategory = {
  id: 'category-work',
  name: 'Work',
  order: 0,
  isVisible: true,
  createdAt: FIXED_TIMESTAMP,
  updatedAt: FIXED_TIMESTAMP,
}

export const personalCategoryFixture: ShortcutCategory = {
  id: 'category-personal',
  name: 'Personal',
  order: 1,
  isVisible: true,
  createdAt: FIXED_TIMESTAMP,
  updatedAt: FIXED_TIMESTAMP,
}

/** Empty category fixture covers the spec edge case: empty categories must not clutter the UI. */
export const emptyCategoryFixture: ShortcutCategory = {
  id: 'category-empty',
  name: 'Unused',
  order: 2,
  isVisible: true,
  createdAt: FIXED_TIMESTAMP,
  updatedAt: FIXED_TIMESTAMP,
}

/** The well-known fallback category every shortcut resolves to when none is picked — see `resolveGeneralCategory`. */
export const generalCategoryFixture: ShortcutCategory = {
  id: 'category-general',
  name: 'General',
  order: 3,
  isVisible: true,
  createdAt: FIXED_TIMESTAMP,
  updatedAt: FIXED_TIMESTAMP,
}

/**
 * `globalOrder` is the single source of truth for render order across the
 * whole dashboard (see `Shortcut.globalOrder`) — categories are pure
 * filters over this one sequence, so these values (0..3, in fixture array
 * order) are what both "Todas" and any single-category view derive from.
 */
export const dashboardShortcutFixtures: Shortcut[] = [
  {
    id: 'shortcut-mail',
    label: 'Mail',
    url: 'https://mail.example.com',
    categoryId: workCategoryFixture.id,
    globalOrder: 0,
    createdAt: FIXED_TIMESTAMP,
    updatedAt: FIXED_TIMESTAMP,
  },
  {
    id: 'shortcut-calendar',
    label: 'Calendar',
    url: 'https://calendar.example.com',
    categoryId: workCategoryFixture.id,
    globalOrder: 1,
    createdAt: FIXED_TIMESTAMP,
    updatedAt: FIXED_TIMESTAMP,
  },
  {
    id: 'shortcut-news',
    label: 'News',
    url: 'https://news.example.com',
    categoryId: personalCategoryFixture.id,
    globalOrder: 2,
    createdAt: FIXED_TIMESTAMP,
    updatedAt: FIXED_TIMESTAMP,
  },
  {
    id: 'shortcut-notes',
    label: 'Notes',
    url: 'https://notes.example.com',
    categoryId: generalCategoryFixture.id,
    globalOrder: 3,
    createdAt: FIXED_TIMESTAMP,
    updatedAt: FIXED_TIMESTAMP,
  },
]

export const defaultDashboardConfigFixture: DashboardConfiguration = {
  version: 1,
  themePreference: { mode: 'system', resolvedMode: 'light' },
  searchPreference: {
    providerName: 'Example Search',
    searchUrlTemplate: 'https://search.example.com/?q={query}',
    openBehavior: 'currentTab',
  },
  weatherPreference: {
    mode: 'configuredLocation',
    locationLabel: 'Example City',
    units: 'metric',
    enabled: true,
  },
  shortcuts: dashboardShortcutFixtures,
  categories: [workCategoryFixture, personalCategoryFixture, emptyCategoryFixture, generalCategoryFixture],
  updatedAt: FIXED_TIMESTAMP,
}

/** Serialized form of a valid, previously-saved dashboard configuration. */
export const validSerializedDashboardConfigFixture = JSON.stringify(
  defaultDashboardConfigFixture,
)

/** Not parseable as JSON at all. */
export const malformedJsonStorageFixture = '{ "version": 1, "shortcuts": ['

/** Parseable JSON, but an unrecognized/unmigratable schema version. */
export const invalidVersionConfigFixture = JSON.stringify({
  ...defaultDashboardConfigFixture,
  version: 999,
})

/** Parseable JSON missing required top-level groups. */
export const missingFieldsConfigFixture = JSON.stringify({
  version: 1,
  shortcuts: [],
})

/** A shortcut record missing required `label`/`url` fields. */
export const invalidShortcutConfigFixture = JSON.stringify({
  ...defaultDashboardConfigFixture,
  shortcuts: [
    { id: 'shortcut-broken', globalOrder: 0, createdAt: FIXED_TIMESTAMP, updatedAt: FIXED_TIMESTAMP },
  ],
})

/** A shortcut whose `categoryId` does not match any existing category. */
export const orphanCategoryReferenceConfigFixture = JSON.stringify({
  ...defaultDashboardConfigFixture,
  shortcuts: [
    {
      id: 'shortcut-orphan',
      label: 'Orphan',
      url: 'https://orphan.example.com',
      categoryId: 'category-does-not-exist',
      globalOrder: 0,
      createdAt: FIXED_TIMESTAMP,
      updatedAt: FIXED_TIMESTAMP,
    },
  ],
})

/**
 * Mix of one valid and one invalid shortcut, for verifying partial recovery:
 * valid records must survive even when sibling records are dropped or repaired.
 */
export const partiallyInvalidConfigFixture = JSON.stringify({
  ...defaultDashboardConfigFixture,
  shortcuts: [
    dashboardShortcutFixtures[0],
    { id: 'shortcut-broken', globalOrder: 1, createdAt: FIXED_TIMESTAMP, updatedAt: FIXED_TIMESTAMP },
  ],
})

/** Writes a fixture (defaults to the valid serialized config) into `window.localStorage`. */
export function seedDashboardStorage(
  serializedConfig: string = validSerializedDashboardConfigFixture,
): void {
  window.localStorage.setItem(DASHBOARD_STORAGE_KEY, serializedConfig)
}

/**
 * Removes any dashboard configuration from `window.localStorage` and from
 * `defaultStorageProvider`'s in-memory fallback (in case a prior test in the
 * same run wrote to it while real storage was unavailable) so tests stay
 * isolated from one another.
 */
export function clearDashboardStorage(): void {
  window.localStorage.removeItem(DASHBOARD_STORAGE_KEY)
  defaultStorageProvider.remove(DASHBOARD_STORAGE_KEY)
}
