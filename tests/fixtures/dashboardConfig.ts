/**
 * Shared test fixtures for dashboard configuration and browser storage.
 *
 * These local types mirror `specs/001-browser-dashboard/data-model.md` and are
 * intentionally independent from `src/types/dashboard.ts` (defined in T009),
 * since this fixture module is created in Phase 1 (Setup), before the
 * Foundational phase introduces the real domain types.
 */

export type ThemeMode = 'light' | 'dark' | 'system'

export interface ThemePreferenceFixture {
  mode: ThemeMode
}

export interface SearchPreferenceFixture {
  providerName: string
  searchUrlTemplate: string
  openBehavior: 'currentTab' | 'newTab'
}

export interface WeatherPreferenceFixture {
  mode: 'configuredLocation' | 'browserLocation'
  locationLabel?: string
  units: 'metric' | 'imperial'
  enabled: boolean
}

export interface ShortcutFixture {
  id: string
  label: string
  url: string
  categoryId?: string
  description?: string
  icon?: string
  order: number
  createdAt: string
  updatedAt: string
}

export interface ShortcutCategoryFixture {
  id: string
  name: string
  order: number
  isVisible: boolean
  createdAt: string
  updatedAt: string
}

export interface DashboardConfigurationFixture {
  version: number
  themePreference: ThemePreferenceFixture
  searchPreference: SearchPreferenceFixture
  weatherPreference: WeatherPreferenceFixture
  shortcuts: ShortcutFixture[]
  categories: ShortcutCategoryFixture[]
  updatedAt: string
}

/** Storage key `configStore.ts` (T015) must reuse to read/write this fixture data. */
export const DASHBOARD_STORAGE_KEY = 'dashboard.config.v1'

const FIXED_TIMESTAMP = '2026-07-08T09:00:00.000Z'

export const workCategoryFixture: ShortcutCategoryFixture = {
  id: 'category-work',
  name: 'Work',
  order: 0,
  isVisible: true,
  createdAt: FIXED_TIMESTAMP,
  updatedAt: FIXED_TIMESTAMP,
}

export const personalCategoryFixture: ShortcutCategoryFixture = {
  id: 'category-personal',
  name: 'Personal',
  order: 1,
  isVisible: true,
  createdAt: FIXED_TIMESTAMP,
  updatedAt: FIXED_TIMESTAMP,
}

/** Empty category fixture covers the spec edge case: empty categories must not clutter the UI. */
export const emptyCategoryFixture: ShortcutCategoryFixture = {
  id: 'category-empty',
  name: 'Unused',
  order: 2,
  isVisible: true,
  createdAt: FIXED_TIMESTAMP,
  updatedAt: FIXED_TIMESTAMP,
}

export const dashboardShortcutFixtures: ShortcutFixture[] = [
  {
    id: 'shortcut-mail',
    label: 'Mail',
    url: 'https://mail.example.com',
    categoryId: workCategoryFixture.id,
    order: 0,
    createdAt: FIXED_TIMESTAMP,
    updatedAt: FIXED_TIMESTAMP,
  },
  {
    id: 'shortcut-calendar',
    label: 'Calendar',
    url: 'https://calendar.example.com',
    categoryId: workCategoryFixture.id,
    order: 1,
    createdAt: FIXED_TIMESTAMP,
    updatedAt: FIXED_TIMESTAMP,
  },
  {
    id: 'shortcut-news',
    label: 'News',
    url: 'https://news.example.com',
    categoryId: personalCategoryFixture.id,
    order: 0,
    createdAt: FIXED_TIMESTAMP,
    updatedAt: FIXED_TIMESTAMP,
  },
  {
    id: 'shortcut-uncategorized',
    label: 'Notes',
    url: 'https://notes.example.com',
    order: 0,
    createdAt: FIXED_TIMESTAMP,
    updatedAt: FIXED_TIMESTAMP,
  },
]

export const defaultDashboardConfigFixture: DashboardConfigurationFixture = {
  version: 1,
  themePreference: { mode: 'system' },
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
  categories: [workCategoryFixture, personalCategoryFixture, emptyCategoryFixture],
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
    { id: 'shortcut-broken', order: 0, createdAt: FIXED_TIMESTAMP, updatedAt: FIXED_TIMESTAMP },
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
      order: 0,
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
    { id: 'shortcut-broken', order: 1, createdAt: FIXED_TIMESTAMP, updatedAt: FIXED_TIMESTAMP },
  ],
})

/** Writes a fixture (defaults to the valid serialized config) into `window.localStorage`. */
export function seedDashboardStorage(
  serializedConfig: string = validSerializedDashboardConfigFixture,
): void {
  window.localStorage.setItem(DASHBOARD_STORAGE_KEY, serializedConfig)
}

/** Removes any dashboard configuration from `window.localStorage`. */
export function clearDashboardStorage(): void {
  window.localStorage.removeItem(DASHBOARD_STORAGE_KEY)
}
