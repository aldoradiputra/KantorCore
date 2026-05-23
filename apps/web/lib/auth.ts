import { randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
  clearSessionCookieOptions,
  hashPassword,
  verifyPassword,
} from '@kantorcore/auth'
import {
  createSession,
  validateSessionToken,
  invalidateSession,
  type SessionWithUser,
} from '@kantorcore/auth/server'
import { users, sessions, totpChallenges } from '@kantorcore/db'
import { eq, and, gt, isNull } from 'drizzle-orm'
import { getDb } from './db'
import { provisionTenant, validateSlug } from './tenants'

/** Returns the current session+user, or null when unauthenticated. */
export async function getCurrentSession(): Promise<SessionWithUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (!token) return null
  return validateSessionToken(getDb(), token)
}

export async function signUp(input: {
  email: string
  name: string
  password: string
  workspaceName: string
  workspaceSlug: string
  meta?: { ip?: string | null; userAgent?: string | null }
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase()
  const name = input.name.trim()
  const workspaceSlug = input.workspaceSlug.trim().toLowerCase()
  const workspaceName = input.workspaceName.trim()

  if (!email || !email.includes('@')) return { ok: false, error: 'Email tidak valid.' }
  if (name.length < 2) return { ok: false, error: 'Nama terlalu pendek.' }
  if (input.password.length < 10) {
    return { ok: false, error: 'Kata sandi minimal 10 karakter.' }
  }
  if (workspaceName.length < 2) return { ok: false, error: 'Nama workspace terlalu pendek.' }
  const slugError = validateSlug(workspaceSlug)
  if (slugError) return { ok: false, error: slugError }

  const db = getDb()
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (existing.length > 0) return { ok: false, error: 'Email sudah terdaftar.' }

  const passwordHash = await hashPassword(input.password)
  const [user] = await db
    .insert(users)
    .values({ email, name, passwordHash })
    .returning({ id: users.id })

  const provision = await provisionTenant({
    userId: user.id,
    name: workspaceName,
    slug: workspaceSlug,
  })
  if (!provision.ok) {
    // User row was created but tenant failed — surface the slug error to the
    // form. The user can retry sign-in and call /api/provision separately.
    return { ok: false, error: provision.error }
  }

  const session = await createSession(db, user.id)
  await db
    .update(sessions)
    .set({ ip: input.meta?.ip ?? null, userAgent: input.meta?.userAgent ?? null, lastSeenAt: new Date() })
    .where(eq(sessions.token, session.token))
  await setSessionCookie(session.token, session.expiresAt)
  return { ok: true }
}

export type SignInResult =
  | { ok: true }
  | { ok: false; error: string }
  | { ok: false; totpRequired: true; challengeToken: string }

export async function signIn(input: {
  email: string
  password: string
  meta?: { ip?: string | null; userAgent?: string | null }
}): Promise<SignInResult> {
  const email = input.email.trim().toLowerCase()
  const db = getDb()

  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash, totpEnabled: users.totpEnabled })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (!user) return { ok: false, error: 'Email atau kata sandi salah.' }

  const ok = await verifyPassword(input.password, user.passwordHash)
  if (!ok) return { ok: false, error: 'Email atau kata sandi salah.' }

  if (user.totpEnabled) {
    const challengeToken = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
    await db.insert(totpChallenges).values({ token: challengeToken, userId: user.id, expiresAt })
    return { ok: false, totpRequired: true, challengeToken }
  }

  const session = await createSession(db, user.id)
  await db
    .update(sessions)
    .set({ ip: input.meta?.ip ?? null, userAgent: input.meta?.userAgent ?? null, lastSeenAt: new Date() })
    .where(eq(sessions.token, session.token))
  await setSessionCookie(session.token, session.expiresAt)
  return { ok: true }
}

export async function signOut(): Promise<void> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (token) {
    await invalidateSession(getDb(), token)
  }
  cookieStore.set(SESSION_COOKIE_NAME, '', clearSessionCookieOptions(secureCookies()))
}

async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(expiresAt, secureCookies()))
}

function secureCookies(): boolean {
  return process.env.NODE_ENV === 'production'
}
