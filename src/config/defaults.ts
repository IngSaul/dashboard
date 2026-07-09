import type { DashboardConfiguration } from '../types/dashboard'

/**
 * Fallback and first-launch configuration.
 *
 * Used by `schema.ts` (T011) to recover from missing/invalid persisted
 * configuration, and by the dashboard shell on first launch so search,
 * date/time, weather, and shortcut cards are useful before the user
 * personalizes anything (see `data-model.md` and US1 in spec.md).
 */

export const DEFAULT_DASHBOARD_CONFIG_VERSION = 1

const GENERAL_CATEGORY_ID = 'category-general'

/**
 * Returns a fresh, independent default configuration. A factory (rather than
 * a shared constant) avoids two consumers accidentally mutating the same
 * shortcuts/categories arrays, since user story 2 edits them in place.
 */
export function createDefaultDashboardConfig(): DashboardConfiguration {
  const now = new Date().toISOString()

  return {
    version: DEFAULT_DASHBOARD_CONFIG_VERSION,
    themePreference: {
      mode: 'system',
      resolvedMode: 'light',
    },
    searchPreference: {
      providerName: 'Web Search',
      searchUrlTemplate: 'https://www.google.com/search?q={query}',
      openBehavior: 'currentTab',
    },
    weatherPreference: {
      mode: 'browserLocation',
      units: 'metric',
      enabled: true,
    },
    categories: [
      {
        id: GENERAL_CATEGORY_ID,
        name: 'General',
        order: 0,
        isVisible: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    shortcuts: [
      {
        id: 'shortcut-gmail',
        label: 'Gmail',
        url: 'https://mail.google.com/',
        categoryId: GENERAL_CATEGORY_ID,
        order: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'shortcut-calendar',
        label: 'Calendar',
        url: 'https://calendar.google.com/',
        categoryId: GENERAL_CATEGORY_ID,
        order: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'shortcut-youtube',
        label: 'YouTube',
        url: 'https://youtube.com/',
        categoryId: GENERAL_CATEGORY_ID,
        order: 2,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'shortcut-github',
        label: 'GitHub',
        url: 'https://github.com/',
        categoryId: GENERAL_CATEGORY_ID,
        order: 3,
        createdAt: now,
        updatedAt: now,
      },
    ],
    updatedAt: now,
  }
}
