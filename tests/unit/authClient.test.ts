import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAuthClient } from '../../src/services/auth/AuthClient'
import { createDefaultDashboardConfig } from '../../src/config/defaults'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('AuthClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('login: maps a 200 to a success outcome with the user', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { id: 1, username: 'admin', role: 'admin' }))
    const client = createAuthClient()

    const outcome = await client.login({ username: 'admin', password: 'secret123' })

    expect(outcome).toEqual({ kind: 'success', user: { id: 1, username: 'admin', role: 'admin' } })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    )
  })

  it('login: maps a 401 to invalid-credentials', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { error: 'invalid credentials' }))
    const client = createAuthClient()

    const outcome = await client.login({ username: 'admin', password: 'wrong' })

    expect(outcome).toEqual({ kind: 'invalid-credentials' })
  })

  it('login: maps a 423 to locked with retryAfterSeconds', async () => {
    fetchMock.mockResolvedValue(jsonResponse(423, { error: 'account locked', retryAfterSeconds: 900 }))
    const client = createAuthClient()

    const outcome = await client.login({ username: 'admin', password: 'wrong' })

    expect(outcome).toEqual({ kind: 'locked', retryAfterSeconds: 900 })
  })

  it('me: returns the user on 200 and null on 401', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 1, username: 'admin', role: 'admin' }))
    const client = createAuthClient()
    await expect(client.me()).resolves.toEqual({ id: 1, username: 'admin', role: 'admin' })

    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: 'unauthenticated' }))
    await expect(client.me()).resolves.toBeNull()
  })

  it('getDashboard: distinguishes found/not-found/error', async () => {
    const config = createDefaultDashboardConfig()
    const client = createAuthClient()

    fetchMock.mockResolvedValueOnce(jsonResponse(200, config))
    await expect(client.getDashboard()).resolves.toEqual({ kind: 'found', config })

    fetchMock.mockResolvedValueOnce(jsonResponse(404, { error: 'not found' }))
    await expect(client.getDashboard()).resolves.toEqual({ kind: 'not-found' })

    fetchMock.mockResolvedValueOnce(jsonResponse(500, { error: 'boom' }))
    await expect(client.getDashboard()).resolves.toEqual({ kind: 'error' })
  })

  it('putDashboard: resolves true on 200, false on any other outcome (never throws)', async () => {
    const client = createAuthClient()
    const config = createDefaultDashboardConfig()

    fetchMock.mockResolvedValueOnce(jsonResponse(200, { updatedAt: '2026-01-01T00:00:00.000Z' }))
    await expect(client.putDashboard(config)).resolves.toBe(true)

    fetchMock.mockResolvedValueOnce(jsonResponse(400, { error: 'invalid' }))
    await expect(client.putDashboard(config)).resolves.toBe(false)

    fetchMock.mockRejectedValueOnce(new Error('network down'))
    await expect(client.putDashboard(config)).resolves.toBe(false)
  })

  it('a 401 from any endpoint invokes onUnauthenticated exactly once per call', async () => {
    const onUnauthenticated = vi.fn()
    const client = createAuthClient({ onUnauthenticated })
    fetchMock.mockResolvedValue(jsonResponse(401, { error: 'unauthenticated' }))

    await client.me()
    await client.putDashboard(createDefaultDashboardConfig())

    expect(onUnauthenticated).toHaveBeenCalledTimes(2)
  })

  it('a non-401 response never invokes onUnauthenticated', async () => {
    const onUnauthenticated = vi.fn()
    const client = createAuthClient({ onUnauthenticated })
    fetchMock.mockResolvedValue(jsonResponse(200, { id: 1, username: 'admin', role: 'admin' }))

    await client.me()

    expect(onUnauthenticated).not.toHaveBeenCalled()
  })

  describe('createUser', () => {
    it('maps 201/403/409 to their respective outcomes', async () => {
      const client = createAuthClient()

      fetchMock.mockResolvedValueOnce(jsonResponse(201, { id: 2, username: 'bob', role: 'user' }))
      await expect(
        client.createUser({ username: 'bob', password: 'password123', role: 'user' }),
      ).resolves.toEqual({ kind: 'success', user: { id: 2, username: 'bob', role: 'user' } })

      fetchMock.mockResolvedValueOnce(jsonResponse(403, { error: 'forbidden' }))
      await expect(
        client.createUser({ username: 'bob', password: 'password123', role: 'user' }),
      ).resolves.toEqual({ kind: 'forbidden' })

      fetchMock.mockResolvedValueOnce(jsonResponse(409, { error: 'conflict' }))
      await expect(
        client.createUser({ username: 'bob', password: 'password123', role: 'user' }),
      ).resolves.toEqual({ kind: 'conflict' })
    })
  })
})
