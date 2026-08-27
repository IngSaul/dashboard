import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuthState } from '../../../src/state/AuthProvider'
import { createDefaultDashboardConfig } from '../../../src/config/defaults'
import { DASHBOARD_CONFIG_STORAGE_KEY, saveDashboardConfig } from '../../../src/services/configStore'
import { clearDashboardStorage } from '../../fixtures/dashboardConfig'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
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
        return Promise.resolve(jsonResponse(200, config))
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
        return Promise.resolve(jsonResponse(200, config))
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
