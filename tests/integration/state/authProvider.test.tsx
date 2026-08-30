import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuthState } from '../../../src/state/AuthProvider'
import { createDefaultDashboardConfig } from '../../../src/config/defaults'
import { DASHBOARD_CONFIG_STORAGE_KEY, saveDashboardConfig } from '../../../src/services/configStore'
import { clearDashboardStorage } from '../../fixtures/dashboardConfig'

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

/**
 * The dashboard routes always answer with the current revision as a strong
 * ETag, and a client that never learns one deliberately refuses to write
 * (it cannot prove what its edits are based on) — so a stub that omits it
 * is not a stub of this server.
 */
function dashboardResponse(status: number, body: unknown, revision: number): Response {
  return jsonResponse(status, body, { ETag: `"${revision}"` })
}

function Probe() {
  const { state } = useAuthState()
  return <div data-testid="auth-status">{state.status}</div>
}

describe('AuthProvider', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    clearDashboardStorage()
  })

  it('transitions checking -> unauthenticated when there is no session', async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith('/auth/me')) {
        return Promise.resolve(jsonResponse(401, { error: 'unauthenticated' }))
      }
      throw new Error(`unexpected fetch: ${url}`)
    })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    expect(screen.getByTestId('auth-status').textContent).toBe('checking')
    await waitFor(() => expect(screen.getByTestId('auth-status').textContent).toBe('unauthenticated'))
  })

  it('transitions checking -> authenticated when a session and existing config are found', async () => {
    const config = createDefaultDashboardConfig()
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith('/auth/me')) {
        return Promise.resolve(jsonResponse(200, { id: 1, username: 'admin', role: 'admin' }))
      }
      if (url.endsWith('/dashboard')) {
        return Promise.resolve(dashboardResponse(200, config, 1))
      }
      throw new Error(`unexpected fetch: ${url}`)
    })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('auth-status').textContent).toBe('authenticated'))
  })

  it('refuses to write when the config could not be read, rather than overwriting it blind', async () => {
    let putCount = 0
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url.endsWith('/auth/me')) {
        return Promise.resolve(jsonResponse(200, { id: 1, username: 'admin', role: 'admin' }))
      }
      if (url.endsWith('/dashboard') && init?.method === 'PUT') {
        putCount += 1
        return Promise.resolve(jsonResponse(200, { revision: 1 }, { ETag: '"1"' }))
      }
      // The account almost certainly *has* a configuration; this tab just
      // failed to read it. Writing now would replace it with defaults.
      if (url.endsWith('/dashboard')) {
        return Promise.resolve(jsonResponse(500, { error: 'boom' }))
      }
      throw new Error(`unexpected fetch: ${url}`)
    })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('auth-status').textContent).toBe('authenticated'))

    saveDashboardConfig(createDefaultDashboardConfig())
    await new Promise((resolve) => setTimeout(resolve, 1500))

    expect(putCount).toBe(0)
  })

  it('a 401 from a later background save returns to unauthenticated exactly once, without looping', async () => {
    const config = createDefaultDashboardConfig()
    let putCount = 0
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url.endsWith('/auth/me')) {
        return Promise.resolve(jsonResponse(200, { id: 1, username: 'admin', role: 'admin' }))
      }
      if (url.endsWith('/dashboard') && init?.method === 'PUT') {
        putCount += 1
        return Promise.resolve(jsonResponse(401, { error: 'unauthenticated' }))
      }
      if (url.endsWith('/dashboard')) {
        return Promise.resolve(dashboardResponse(200, config, 4))
      }
      throw new Error(`unexpected fetch: ${url}`)
    })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('auth-status').textContent).toBe('authenticated'))

    // Exercises the real production path: a config change flows through
    // configStore -> defaultStorageProvider -> the RemoteStorageProvider
    // AuthProvider swapped in -> its debounced PUT /dashboard, which here
    // returns 401 (session expired mid-session).
    saveDashboardConfig(config)

    await waitFor(() => expect(screen.getByTestId('auth-status').textContent).toBe('unauthenticated'), {
      timeout: 2000,
    })
    expect(putCount).toBe(1)
  })

  it('first login with no server config: repairs a corrupted local config (via the real repairDashboardConfig) before uploading it', async () => {
    // Deliberately corrupted: not valid JSON at all. If AuthProvider ever
    // reimplemented repair logic (or skipped it), this would either crash
    // or upload garbage — the existing repairDashboardConfig must be what
    // turns this into a complete, valid DashboardConfiguration (spec FR-016).
    window.localStorage.setItem(DASHBOARD_CONFIG_STORAGE_KEY, '{ not valid json')

    let putBody: unknown
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url.endsWith('/auth/me')) {
        return Promise.resolve(jsonResponse(200, { id: 1, username: 'admin', role: 'admin' }))
      }
      if (url.endsWith('/dashboard') && init?.method === 'PUT') {
        putBody = JSON.parse(init.body as string)
        return Promise.resolve(jsonResponse(200, { updatedAt: '2026-01-01T00:00:00.000Z' }))
      }
      if (url.endsWith('/dashboard')) {
        return Promise.resolve(jsonResponse(404, { error: 'not found' }))
      }
      throw new Error(`unexpected fetch: ${url}`)
    })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('auth-status').textContent).toBe('authenticated'))
    await waitFor(() => expect(putBody).toBeDefined())

    const expected = createDefaultDashboardConfig()
    const body = putBody as { version: number; shortcuts: Array<{ label: string; url: string }> }
    expect(body.version).toBe(expected.version)
    expect(body.shortcuts.map((s) => [s.label, s.url])).toEqual(
      expected.shortcuts.map((s) => [s.label, s.url]),
    )
  })
})
