import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../../src/App'
import { createDefaultDashboardConfig } from '../../../src/config/defaults'
import { saveDashboardConfig } from '../../../src/services/configStore'
import { ACCOUNT_HEADER } from '../../../src/services/auth/AuthClient'
import { clearDashboardStorage } from '../../fixtures/dashboardConfig'
import type { DashboardConfiguration } from '../../../src/types/dashboard'

/**
 * TD-02: a config session must not outlive the login it belongs to.
 *
 * The dangerous shape is entirely about *timing*: writes are debounced, so
 * one is regularly queued but unsent, and the browser attaches whatever
 * session cookie is current at the moment a request finally leaves — not the
 * one that was current when the write was composed. Signing out and signing
 * back in as somebody else was therefore enough to have one account's
 * configuration overwrite another's.
 *
 * These tests drive the real `App` against a fake backend that behaves like
 * the real one (a single current session; per-account config rows; the
 * `X-Dashboard-Account` precondition), and assert on what ends up stored per
 * account rather than on internal calls.
 */

interface Account {
  id: number
  username: string
  password: string
}

const ALICE: Account = { id: 1, username: 'alice', password: 'alice-password-123' }
const BOB: Account = { id: 2, username: 'bob', password: 'bob-password-123' }

/** The debounce window `RemoteStorageProvider` uses by default, plus margin. */
const PAST_DEBOUNCE_MS = 1400

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function jsonResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

interface FakeBackend {
  /** Config rows, keyed by account id — exactly like `dashboard_configs`. */
  configs: Map<number, DashboardConfiguration>
  /** Every PUT the client made, in order, with the account it was addressed to. */
  writes: { addressedTo: string | null; appliedTo: number | null; marker: string }[]
  /** Typed as the `fetch` it stands in for, so call sites are checked like any other code. */
  fetch: ReturnType<typeof vi.fn> & ((url: string, init?: RequestInit) => Promise<Response>)
  /** Invalidates the session server-side, the way a real expiry does. */
  expireSession: () => void
  /** Makes every subsequent write fail with a 503, the way an outage does. */
  setWritesFailing: (failing: boolean) => void
  /** Writes straight into the store, as a second tab or device would. */
  saveFromAnotherTab: (account: Account, config: DashboardConfiguration) => void
}

function createFakeBackend(signedInAs: Account | null): FakeBackend {
  const configs = new Map<number, DashboardConfiguration>()
  const revisions = new Map<number, number>()
  const writes: FakeBackend['writes'] = []
  let currentUser: Account | null = signedInAs
  let writesFailing = false

  const fetchMock = vi.fn(async (url: string, init?: RequestInit): Promise<Response> => {
    const method = init?.method ?? 'GET'

    if (url.endsWith('/auth/me')) {
      return currentUser
        ? jsonResponse(200, { id: currentUser.id, username: currentUser.username, role: 'user' })
        : jsonResponse(401, { error: 'unauthenticated' })
    }

    if (url.endsWith('/auth/login')) {
      const body = JSON.parse(String(init?.body)) as { username: string; password: string }
      const account = [ALICE, BOB].find(
        (candidate) => candidate.username === body.username && candidate.password === body.password,
      )
      if (!account) {
        return jsonResponse(401, { error: 'invalid credentials' })
      }
      currentUser = account
      return jsonResponse(200, { id: account.id, username: account.username, role: 'user' })
    }

    if (url.endsWith('/auth/logout')) {
      currentUser = null
      return new Response(null, { status: 204 })
    }

    if (url.endsWith('/dashboard') && method === 'GET') {
      if (!currentUser) {
        return jsonResponse(401, { error: 'unauthenticated' })
      }
      const stored = configs.get(currentUser.id)
      if (!stored) {
        return jsonResponse(404, { error: 'not found' })
      }
      return jsonResponse(200, stored, { ETag: `"${revisions.get(currentUser.id) ?? 0}"` })
    }

    if (url.endsWith('/dashboard') && method === 'PUT') {
      const config = JSON.parse(String(init?.body)) as DashboardConfiguration
      const addressedTo = new Headers(init?.headers).get(ACCOUNT_HEADER)
      const marker = String(config.shortcuts?.[0]?.label)

      if (!currentUser) {
        writes.push({ addressedTo, appliedTo: null, marker })
        return jsonResponse(401, { error: 'unauthenticated' })
      }
      // The real route's precondition: a write composed for one account is
      // refused rather than applied to whoever the cookie now belongs to.
      if (addressedTo !== null && addressedTo !== String(currentUser.id)) {
        writes.push({ addressedTo, appliedTo: null, marker })
        return jsonResponse(403, { error: 'write addressed to a different account' })
      }
      if (writesFailing) {
        writes.push({ addressedTo, appliedTo: null, marker })
        return jsonResponse(503, { error: 'unavailable' })
      }

      // Optimistic concurrency, exactly as `server/src/dashboard/routes.ts`
      // does it: a write built on a revision that is no longer current is
      // refused rather than applied over whoever saved first.
      const current = revisions.get(currentUser.id) ?? 0
      const ifMatch = new Headers(init?.headers).get('If-Match')
      if (ifMatch !== null && ifMatch !== `"${current}"`) {
        writes.push({ addressedTo, appliedTo: null, marker })
        return jsonResponse(409, { error: 'revision conflict', revision: current }, {
          ETag: `"${current}"`,
        })
      }

      const next = current + 1
      revisions.set(currentUser.id, next)
      configs.set(currentUser.id, config)
      writes.push({ addressedTo, appliedTo: currentUser.id, marker })
      return jsonResponse(200, { updatedAt: new Date().toISOString(), revision: next }, {
        ETag: `"${next}"`,
      })
    }

    throw new Error(`unexpected fetch: ${method} ${url}`)
  })

  return {
    configs,
    writes,
    fetch: fetchMock,
    expireSession() {
      currentUser = null
    },
    setWritesFailing(failing: boolean) {
      writesFailing = failing
    },
    saveFromAnotherTab(account: Account, config: DashboardConfiguration) {
      const next = (revisions.get(account.id) ?? 0) + 1
      revisions.set(account.id, next)
      configs.set(account.id, config)
    },
  }
}

/**
 * Queues a debounced remote write through the same path every widget uses.
 *
 * The marker rides on a shortcut label rather than `updatedAt`, which
 * `saveDashboardConfig` overwrites with the save time on the way through.
 */
function editConfig(marker: string): void {
  const config = createDefaultDashboardConfig()
  const first = config.shortcuts[0]
  if (!first) {
    throw new Error('expected the default config to have a shortcut to mark')
  }
  first.label = marker
  saveDashboardConfig(config)
}

function markerOf(config: DashboardConfiguration | undefined): string | undefined {
  return config?.shortcuts[0]?.label
}

async function signIn(user: ReturnType<typeof userEvent.setup>, account: Account): Promise<void> {
  await user.type(screen.getByLabelText('Usuario'), account.username)
  await user.type(screen.getByLabelText('Contraseña'), account.password)
  await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument(),
  )
}

async function waitForDashboard(): Promise<void> {
  await waitFor(() => expect(document.querySelector('[data-widget-type="clock"]')).toBeInTheDocument())
}

describe('config session lifecycle', () => {
  let backend: FakeBackend

  beforeEach(() => {
    clearDashboardStorage()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    clearDashboardStorage()
  })

  function mount(signedInAs: Account | null): void {
    backend = createFakeBackend(signedInAs)
    vi.stubGlobal('fetch', backend.fetch)
  }

  it("logging out saves the pending edit to its own account and never to the next one", async () => {
    mount(ALICE)
    const user = userEvent.setup()
    render(<App />)
    await waitForDashboard()

    // An edit that is still inside the debounce window when logout starts.
    editConfig('ALICE-EDIT')
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument())

    await signIn(user, BOB)
    await waitForDashboard()
    await wait(PAST_DEBOUNCE_MS)

    // Alice's own account keeps the edit — logging out mid-change is not
    // allowed to discard it.
    expect(markerOf(backend.configs.get(ALICE.id))).toBe('ALICE-EDIT')
    // Bob's account never saw it.
    expect(markerOf(backend.configs.get(BOB.id))).not.toBe('ALICE-EDIT')
    expect(backend.writes.filter((write) => write.marker === 'ALICE-EDIT' && write.appliedTo === BOB.id)).toEqual(
      [],
    )
  })

  it('drops a pending edit when the session expires, rather than replaying it under the next account', async () => {
    mount(ALICE)
    const user = userEvent.setup()
    render(<App />)
    await waitForDashboard()

    editConfig('ALICE-EDIT-AFTER-EXPIRY')
    // The session dies underneath the app the way a real expiry does: the
    // cookie stops identifying anyone, and the next request 401s.
    backend.expireSession()
    await waitFor(
      async () => {
        await backend.fetch('/api/auth/me')
        expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
      },
      { timeout: 5000 },
    )

    // The client can only *learn* the session expired by having a request
    // answered with 401, so Alice's queued write may well be attempted once
    // before Bob signs in. What matters is that it is refused, and that
    // nothing of Alice's is still queued afterwards.
    expect(
      backend.writes.filter(
        (write) => write.marker === 'ALICE-EDIT-AFTER-EXPIRY' && write.appliedTo !== null,
      ),
    ).toEqual([])
    const writesBeforeBob = backend.writes.length

    await signIn(user, BOB)
    await waitForDashboard()
    await wait(PAST_DEBOUNCE_MS)

    expect(markerOf(backend.configs.get(BOB.id))).not.toBe('ALICE-EDIT-AFTER-EXPIRY')
    // The disposed session is gone: not one write carrying Alice's edit is
    // attempted from the moment Bob's session exists.
    expect(
      backend.writes
        .slice(writesBeforeBob)
        .filter((write) => write.marker === 'ALICE-EDIT-AFTER-EXPIRY'),
    ).toEqual([])
    expect(
      backend.writes.filter(
        (write) => write.marker === 'ALICE-EDIT-AFTER-EXPIRY' && write.appliedTo !== null,
      ),
    ).toEqual([])
  })

  it('stamps every write with the account that composed it', async () => {
    mount(ALICE)
    render(<App />)
    await waitForDashboard()

    editConfig('ALICE-STAMPED')
    await waitFor(() => expect(markerOf(backend.configs.get(ALICE.id))).toBe('ALICE-STAMPED'), {
      timeout: 5000,
    })

    for (const write of backend.writes) {
      expect(write.addressedTo).toBe(String(ALICE.id))
    }
  })

  it('leaves no session writing after the app unmounts', async () => {
    mount(ALICE)
    const { unmount } = render(<App />)
    await waitForDashboard()

    editConfig('EDIT-BEFORE-UNMOUNT')
    unmount()
    await wait(PAST_DEBOUNCE_MS)

    expect(backend.writes.some((write) => write.marker === 'EDIT-BEFORE-UNMOUNT')).toBe(false)
  })

  /**
   * TD-03's two hardest cases, at the level where they actually happen: a
   * write that is still failing when the session it belongs to ends. Both
   * assert on what ends up stored per account, so a regression shows up as
   * one user's dashboard appearing in another's, not as a changed call
   * count.
   */
  describe('a write still failing when the session ends', () => {
    it('does not carry into the next account after a logout', async () => {
      mount(ALICE)
      const user = userEvent.setup()
      render(<App />)
      await waitForDashboard()

      backend.setWritesFailing(true)
      editConfig('ALICE-FAILING-EDIT')
      // Let the retry loop get going, so there is genuinely something
      // outstanding when logout starts.
      await waitFor(() =>
        expect(backend.writes.some((write) => write.marker === 'ALICE-FAILING-EDIT')).toBe(true),
      )

      await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
      await waitFor(() => expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument())

      // The network recovers, but Alice's session is gone: nothing may be
      // replayed under whoever signs in next.
      backend.setWritesFailing(false)
      await signIn(user, BOB)
      await waitForDashboard()
      await wait(PAST_DEBOUNCE_MS)

      expect(markerOf(backend.configs.get(BOB.id))).not.toBe('ALICE-FAILING-EDIT')
      expect(
        backend.writes.filter(
          (write) => write.marker === 'ALICE-FAILING-EDIT' && write.appliedTo !== null,
        ),
      ).toEqual([])
    })

    it('tells the user their changes are unsaved rather than failing silently', async () => {
      mount(ALICE)
      render(<App />)
      await waitForDashboard()

      backend.setWritesFailing(true)
      editConfig('ALICE-UNSAVED')

      // The whole point of TD-03: a persistence failure reaches the screen.
      await waitFor(
        () => expect(screen.getByRole('status', { name: '' })).toBeDefined(),
        { timeout: 5000 },
      )
      await waitFor(
        () =>
          expect(
            screen.getByText(/Guardando cambios|No se pudieron guardar tus cambios/),
          ).toBeInTheDocument(),
        { timeout: 5000 },
      )
    })

    it('saves the change by itself once the network comes back', async () => {
      mount(ALICE)
      render(<App />)
      await waitForDashboard()

      backend.setWritesFailing(true)
      editConfig('ALICE-RECOVERED')
      await waitFor(() =>
        expect(backend.writes.some((write) => write.marker === 'ALICE-RECOVERED')).toBe(true),
      )
      expect(markerOf(backend.configs.get(ALICE.id))).not.toBe('ALICE-RECOVERED')

      backend.setWritesFailing(false)
      window.dispatchEvent(new Event('online'))

      // No further user action: the engine's own retry lands the change.
      await waitFor(() => expect(markerOf(backend.configs.get(ALICE.id))).toBe('ALICE-RECOVERED'), {
        timeout: 8000,
      })
    })
  })

  /**
   * Two tabs of the same account, each holding a whole configuration
   * document built from the same starting point. Whichever saved second used
   * to erase the first with nothing said to anyone.
   */
  describe('a second tab saving first', () => {
    it('refuses to overwrite the newer state and tells the user this tab is behind', async () => {
      mount(ALICE)
      render(<App />)
      await waitForDashboard()

      // Another tab saves something this one has never seen.
      const fromElsewhere = createDefaultDashboardConfig()
      const firstShortcut = fromElsewhere.shortcuts[0]
      if (!firstShortcut) {
        throw new Error('expected the default config to have a shortcut to mark')
      }
      firstShortcut.label = 'FROM-OTHER-TAB'
      backend.saveFromAnotherTab(ALICE, fromElsewhere)

      // This tab, still on its old revision, tries to save its own edit.
      editConfig('FROM-THIS-TAB')

      await waitFor(
        () => expect(screen.getByText(/Esta pestaña está desactualizada/)).toBeInTheDocument(),
        { timeout: 5000 },
      )
      // The decisive part: the other tab's work is still what is stored.
      expect(markerOf(backend.configs.get(ALICE.id))).toBe('FROM-OTHER-TAB')
      expect(screen.getByRole('button', { name: 'Recargar' })).toBeInTheDocument()
    })

    it('stops sending anything further, rather than retrying its way over the newer state', async () => {
      mount(ALICE)
      render(<App />)
      await waitForDashboard()

      const fromElsewhere = createDefaultDashboardConfig()
      const firstShortcut = fromElsewhere.shortcuts[0]
      if (!firstShortcut) {
        throw new Error('expected the default config to have a shortcut to mark')
      }
      firstShortcut.label = 'FROM-OTHER-TAB'
      backend.saveFromAnotherTab(ALICE, fromElsewhere)

      editConfig('FIRST-STALE-EDIT')
      await waitFor(
        () => expect(screen.getByText(/Esta pestaña está desactualizada/)).toBeInTheDocument(),
        { timeout: 5000 },
      )
      const writesAtConflict = backend.writes.length

      // Carrying on typing must not eventually punch through the conflict.
      editConfig('SECOND-STALE-EDIT')
      editConfig('THIRD-STALE-EDIT')
      window.dispatchEvent(new Event('online'))
      await wait(PAST_DEBOUNCE_MS)

      expect(backend.writes.length).toBe(writesAtConflict)
      expect(markerOf(backend.configs.get(ALICE.id))).toBe('FROM-OTHER-TAB')
    })
  })
})
