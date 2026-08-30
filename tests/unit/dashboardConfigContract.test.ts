import { describe, expect, it } from 'vitest'
import { validateDashboardConfigPayload } from '../../server/src/dashboard/schema'
import { createDefaultDashboardConfig } from '../../src/config/defaults'

describe('server validation round-trip', () => {
  it('stores the default config byte-identically', () => {
    const config = createDefaultDashboardConfig()
    const result = validateDashboardConfigPayload(JSON.parse(JSON.stringify(config)))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(JSON.parse(result.json)).toEqual(JSON.parse(JSON.stringify(config)))
  })

  it('preserves a shortcut icon and every unknown field', () => {
    const config = {
      version: 1,
      unknownTopLevel: { deeply: ['nested', 1, true, null] },
      shortcuts: [
        {
          id: 's1', label: 'GitHub', url: 'https://github.com/', globalOrder: 0,
          createdAt: 'a', updatedAt: 'b', somethingNew: 'kept',
          icon: { provider: 'simple-icons', value: 'github', resolvedAt: 'c', extraIconField: 'kept' },
        },
      ],
    }
    const result = validateDashboardConfigPayload(config)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(JSON.parse(result.json)).toEqual(config)
  })
})
