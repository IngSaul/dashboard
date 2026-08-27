import type { CookieSerializeOptions } from '@fastify/cookie'

/** Shared between login (sets it) and logout (clears it) — see contracts/api-contract.md. */
export const SESSION_COOKIE_NAME = 'dashboard_session'

/** `HttpOnly`/`SameSite=Lax`/`Path=/`, `Secure` gated by `COOKIE_SECURE` — see research.md §4. */
export function sessionCookieOptions(secure: boolean, expires?: Date): CookieSerializeOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    ...(expires ? { expires } : {}),
  }
}
