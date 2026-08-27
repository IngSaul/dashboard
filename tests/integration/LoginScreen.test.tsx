import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '../../src/state/AuthProvider'
import { LoginScreen } from '../../src/components/auth/LoginScreen/LoginScreen'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

/** User Story 2 (spec.md) — LoginScreen distinguishes wrong-credentials from a locked account. */
describe('LoginScreen', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    // Every render here starts unauthenticated (no session yet).
    fetchMock.mockResolvedValue(jsonResponse(401, { error: 'unauthenticated' }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  async function fillAndSubmit(username: string, password: string): Promise<void> {
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Usuario'), username)
    await user.type(screen.getByLabelText('Contraseña'), password)
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
  }

  it('shows a wrong-credentials message on a 401 login response', async () => {
    render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>,
    )

    fetchMock.mockImplementation((url: string) =>
      url.endsWith('/auth/login')
        ? Promise.resolve(jsonResponse(401, { error: 'invalid credentials' }))
        : Promise.resolve(jsonResponse(401, { error: 'unauthenticated' })),
    )

    await fillAndSubmit('admin', 'wrong-password')

    expect(await screen.findByRole('alert')).toHaveTextContent('Usuario o contraseña incorrectos.')
  })

  it('shows a locked-account message with a human-readable retry time on a 423 response', async () => {
    render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>,
    )

    fetchMock.mockImplementation((url: string) =>
      url.endsWith('/auth/login')
        ? Promise.resolve(jsonResponse(423, { error: 'account locked', retryAfterSeconds: 900 }))
        : Promise.resolve(jsonResponse(401, { error: 'unauthenticated' })),
    )

    await fillAndSubmit('admin', 'wrong-password')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('bloqueada')
    expect(alert).toHaveTextContent('15 minutos')
  })

  it('shows a distinct message for a generic/network error', async () => {
    render(
      <AuthProvider>
        <LoginScreen />
      </AuthProvider>,
    )

    fetchMock.mockImplementation((url: string) =>
      url.endsWith('/auth/login')
        ? Promise.resolve(jsonResponse(500, { error: 'boom' }))
        : Promise.resolve(jsonResponse(401, { error: 'unauthenticated' })),
    )

    await fillAndSubmit('admin', 'whatever')

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).not.toMatch(/incorrectos|bloqueada/)
  })
})
