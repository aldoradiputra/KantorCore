import 'server-only'
import { cookies } from 'next/headers'
import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
  clearSessionCookieOptions,
  hashPassword,
  verifyPassword,
} from '@kantr/auth'
import {
  createSession,
  validateSessionToken,
  invalidateSession,
  type SessionWithUser,
} from '@kantr/auth/server'
import { users } from '@kantr/db'
import { eq } from 'drizzle-orm'
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
  await setSessionCookie(session.token, session.expiresAt)
  return { ok: true }
}

export async function signIn(input: {
  email: string
  password: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase()
  const db = getDb()

  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (!user) return { ok: false, error: 'Email atau kata sandi salah.' }

  const ok = await verifyPassword(input.password, user.passwordHash)
  if (!ok) return { ok: false, error: 'Email atau kata sandi salah.' }

  const session = await createSession(db, user.id)
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
