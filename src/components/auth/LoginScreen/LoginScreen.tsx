import { useState, type FormEvent } from 'react'
import { useAuthState } from '../../../state/AuthProvider'
import { GlassCard } from '../../glass/GlassCard/GlassCard'
import { GlassInput } from '../../glass/GlassInput/GlassInput'
import { GlassButton } from '../../glass/GlassButton/GlassButton'
import './LoginScreen.css'

const INVALID_CREDENTIALS_MESSAGE = 'Usuario o contraseña incorrectos.'
const GENERIC_ERROR_MESSAGE = 'No se pudo iniciar sesión. Inténtalo de nuevo.'

function formatRetryAfter(retryAfterSeconds: number): string {
  const minutes = Math.ceil(retryAfterSeconds / 60)
  return minutes <= 1 ? 'en menos de un minuto' : `en ${minutes} minutos`
}

/**
 * Minimal, distraction-free login form built entirely from the existing
 * glass component kit (per the UI contract's "one material" rule) — no new
 * visual language. Distinguishes wrong-credentials, locked-account, and
 * generic errors per spec User Story 2's acceptance scenarios.
 */
export function LoginScreen() {
  const { login } = useAuthState()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const outcome = await login({ username, password })
      if (outcome.kind === 'invalid-credentials') {
        setError(INVALID_CREDENTIALS_MESSAGE)
      } else if (outcome.kind === 'locked') {
        setError(`Cuenta bloqueada temporalmente. Vuelve a intentarlo ${formatRetryAfter(outcome.retryAfterSeconds)}.`)
      } else if (outcome.kind === 'error') {
        setError(GENERIC_ERROR_MESSAGE)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-screen">
      <GlassCard className="login-screen__card">
        <h1 className="login-screen__title">Dashboard</h1>
        <form className="login-screen__form" onSubmit={(event) => void handleSubmit(event)}>
          <GlassInput
            label="Usuario"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
          <GlassInput
            label="Contraseña"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error ? (
            <p className="login-screen__error" role="alert">
              {error}
            </p>
          ) : null}
          <GlassButton type="submit" disabled={submitting} className="login-screen__submit">
            {submitting ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </GlassButton>
        </form>
      </GlassCard>
    </div>
  )
}
