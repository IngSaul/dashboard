import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../src/App'
import { createDefaultDashboardConfig } from '../../src/config/defaults'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

/** User Story 2 (spec.md) — explicit logout ends the session and returns to the login screen. */
describe('logout', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('clicking the logout action calls the logout endpoint and shows LoginScreen', async () => {
    const config = createDefaultDashboardConfig()
    let loggedOut = false
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url.endsWith('/auth/me')) {
        return Promise.resolve(
          loggedOut ? jsonResponse(401, { error: 'unauthenticated' }) : jsonResponse(200, {
            id: 1,
            username: 'admin',
            role: 'admin',
          }),
        )
      }
      if (url.endsWith('/dashboard') && (!init || init.method === undefined)) {
        return Promise.resolve(jsonResponse(200, config))
      }
      if (url.endsWith('/auth/logout')) {
        loggedOut = true
        return Promise.resolve(new Response(null, { status: 204 }))
      }
      throw new Error(`unexpected fetch: ${url}`)
    })

    const user = userEvent.setup()
    render(<App />)

    await waitFor(() =>
      expect(document.querySelector('[data-widget-type="clock"]')).toBeInTheDocument(),
    )

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST' }))
  })
})
