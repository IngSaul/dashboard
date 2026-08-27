import * as argon2 from 'argon2'

/**
 * OWASP-baseline argon2id parameters (timeCost 3, memoryCost 19456 KiB,
 * parallelism 1) — see research.md §3.
 */
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  timeCost: 3,
  memoryCost: 19_456,
  parallelism: 1,
} as const

/** Hashes a plaintext password. The result is what gets stored in `users.password_hash` — the plaintext itself is never persisted or logged. */
export function hashPassword(plaintext: string): Promise<string> {
  return argon2.hash(plaintext, ARGON2_OPTIONS)
}

/** Verifies a plaintext password against a stored hash. Never throws on a wrong password — resolves to `false`. */
export async function verifyPassword(hash: string, plaintext: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plaintext)
  } catch {
    return false
  }
}
