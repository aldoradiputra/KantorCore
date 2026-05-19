import { NextResponse } from 'next/server'
import { getCurrentSession } from '../../../../lib/auth'
import { sessions } from '@kantorcore/db'
import { eq, and, ne } from 'drizzle-orm'
import { getDb } from '../../../../lib/db'
import { cookies } from 'next/headers'
import { SESSION_COOKIE_NAME, clearSessionCookieOptions } from '@kantorcore/auth'

export async function GET() {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const db = getDb()
  const rows = await db
    .select({
      token: sessions.token,
      createdAt: sessions.createdAt,
      expiresAt: sessions.expiresAt,
      ip: sessions.ip,
      userAgent: sessions.userAgent,
      lastSeenAt: sessions.lastSeenAt,
    })
    .from(sessions)
    .where(eq(sessions.userId, session.user.id))
    .orderBy(sessions.createdAt)

  const result = rows.map((r) => ({
    ...r,
    isCurrent: r.token === session.session.token,
    // Never send the token back to the client except for identification
    token: r.token.slice(0, 8) + '…',
    fullToken: r.token,
  }))

  return NextResponse.json({ sessions: result })
}

/** Terminate all sessions except the current one. */
export async function DELETE() {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const db = getDb()
  await db
    .delete(sessions)
    .where(and(eq(sessions.userId, session.user.id), ne(sessions.token, session.session.token)))

  return NextResponse.json({ ok: true })
}
