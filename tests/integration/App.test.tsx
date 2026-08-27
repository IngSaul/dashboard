import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import App from '../../src/App'
import { createDefaultDashboardConfig } from '../../src/config/defaults'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

/**
 * `AuthGate`'s render contract (spec FR-008), exercised through the real
 * composition root `App` (not `Dashboard` directly — see `Dashboard.tsx`'s
 * doc comment for why the gate lives in `App.tsx`).
 */
describe('App (auth gate)', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows a loading state, then LoginScreen, when there is no session', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { error: 'unauthenticated' }))

    render(<App />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Iniciar sesión' })).not.toBeInTheDocument()

    await waitFor(() => expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument())
    // Never a flash of dashboard content before/instead of the login form.
    expect(document.querySelector('[data-widget-type="clock"]')).not.toBeInTheDocument()
  })

  it('never shows LoginScreen or a blank state once authenticated — renders the dashboard directly', async () => {
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

    render(<App />)

    await waitFor(() =>
      expect(document.querySelector('[data-widget-type="clock"]')).toBeInTheDocument(),
    )
    expect(screen.queryByRole('button', { name: 'Iniciar sesión' })).not.toBeInTheDocument()
  })
})
