import { useEffect, type ReactNode } from 'react'
import { LogOut } from 'lucide-react'
import { useAuthState } from '../../../state/AuthProvider'
import { applyResolvedTheme, getSystemPrefersDark, resolveThemeMode } from '../../../services/theme'
import { GlassPanel } from '../../glass/GlassPanel/GlassPanel'
import { GlassIconButton } from '../../glass/GlassIconButton/GlassIconButton'
import { LoginScreen } from '../LoginScreen/LoginScreen'
import './AuthGate.css'

export interface AuthGateProps {
  children: ReactNode
}

/**
 * Renders, in order of `AuthState`: a loading state while `'checking'`,
 * `LoginScreen` while `'unauthenticated'`, or `children` (the real
 * dashboard) once `'authenticated'` — never a flash of dashboard content
 * before the session/config check resolves (spec FR-008). See
 * `AuthProvider`'s doc comment for why this gate exists at all.
 */
export function AuthGate({ children }: AuthGateProps) {
  const { state, migrationNotice, dismissMigrationNotice, logout } = useAuthState()

  // Before any user/theme preference is known, follow the OS preference
  // rather than forcing light mode — `ThemeProvider` (mounted only once
  // `children` renders) takes over with the account's real preference.
  useEffect(() => {
    if (state.status !== 'authenticated') {
      applyResolvedTheme(resolveThemeMode('system', getSystemPrefersDark()))
    }
  }, [state.status])

  if (state.status === 'checking') {
    return (
      <div className="auth-gate-loading">
        <GlassPanel className="auth-gate-loading__panel" role="status">
          Cargando…
        </GlassPanel>
      </div>
    )
  }

  if (state.status === 'unauthenticated') {
    return <LoginScreen />
  }

  return (
    <>
      {children}
      <GlassIconButton
        className="auth-gate-logout"
        aria-label="Cerrar sesión"
        onClick={() => void logout()}
      >
        <LogOut aria-hidden="true" />
      </GlassIconButton>
      {migrationNotice ? (
        <div className="auth-gate-toast" role="status">
          <GlassPanel className="auth-gate-toast__panel">
            <span>{migrationNotice}</span>
            <button
              type="button"
              className="auth-gate-toast__dismiss"
              onClick={dismissMigrationNotice}
              aria-label="Cerrar aviso"
            >
              ×
            </button>
          </GlassPanel>
        </div>
      ) : null}
    </>
  )
}
