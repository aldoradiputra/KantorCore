/**
 * Server-only session helpers. These touch the database; do NOT import from
 * client components. The opaque-token helpers in `./session` are pure and
 * safe to import anywhere.
 */
import { eq } from 'drizzle-orm'
import type { Database } from '@kantr/db'
import { sessions, users, type User, type Session } from '@kantr/db'
import {
  generateSessionToken,
  isSessionValid,
  shouldRefreshSession,
} from './session'

export interface SessionWithUser {
  session: Session
  user: User
}

/** Creates a new session row and returns the cookie-ready token + expiry. */
export async function createSession(
  db: Database,
  userId: string,
): Promise<Session> {
  const { token, expiresAt } = generateSessionToken()
  const [row] = await db
    .insert(sessions)
    .values({ token, userId, expiresAt })
    .returning()
  return row
}

/**
 * Looks up a session by token, validates expiry, and rolls the expiry
 * forward when the session is in the last third of its lifetime. Returns
 * null for any unknown, expired, or malformed token.
 */
export async function validateSessionToken(
  db: Database,
  token: string,
): Promise<SessionWithUser | null> {
  if (!token) return null

  const rows = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.token, token))
    .limit(1)

  const row = rows[0]
  if (!row) return null

  if (!isSessionValid(row.session.expiresAt)) {
    await db.delete(sessions).where(eq(sessions.token, token))
    return null
  }

  const refreshed = shouldRefreshSession(row.session.expiresAt)
  if (refreshed) {
    await db
      .update(sessions)
      .set({ expiresAt: refreshed })
      .where(eq(sessions.token, token))
    row.session.expiresAt = refreshed
  }

  return { session: row.session, user: row.user }
}

/** Revokes a single session — the sign-out path. */
export async function invalidateSession(db: Database, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.token, token))
}

/** Revokes every session for a user — used on password change. */
export async function invalidateAllUserSessions(
  db: Database,
  userId: string,
): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId))
}
