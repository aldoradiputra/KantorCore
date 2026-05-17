import { randomBytes } from 'node:crypto'

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days

export interface SessionToken {
  token: string
  expiresAt: Date
}

/**
 * Generates a cryptographically random opaque session token. 32 bytes of
 * CSPRNG output, base64url-encoded — 43 chars, ~256 bits of entropy.
 */
export function generateSessionToken(): SessionToken {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000)
  return { token, expiresAt }
}

/** Returns true when the session has not yet expired. */
export function isSessionValid(expiresAt: Date): boolean {
  return expiresAt.getTime() > Date.now()
}

/**
 * Returns a refreshed expiry when the session is within the last third of its
 * lifetime — avoids writing to the DB on every request while keeping sessions
 * alive for active users.
 */
export function shouldRefreshSession(expiresAt: Date): Date | null {
  const now = Date.now()
  const remaining = expiresAt.getTime() - now
  const threshold = (SESSION_TTL_SECONDS * 1000) / 3
  if (remaining < threshold) {
    return new Date(now + SESSION_TTL_SECONDS * 1000)
  }
  return null
}
