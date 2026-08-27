import { Dashboard } from './features/dashboard/Dashboard'
import { AuthGate } from './components/auth/AuthGate/AuthGate'
import { AuthProvider } from './state/AuthProvider'

/**
 * Real composition root: gates `Dashboard` behind session/config
 * resolution (003-auth-persistence). See `Dashboard.tsx`'s doc comment for
 * why the gate lives here rather than inside `Dashboard` itself.
 */
function App() {
  return (
    <AuthProvider>
      <AuthGate>
        <Dashboard />
      </AuthGate>
    </AuthProvider>
  )
}

export default App
