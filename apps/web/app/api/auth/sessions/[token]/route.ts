import { NextResponse } from 'next/server'
import { getCurrentSession } from '../../../../../lib/auth'
import { sessions } from '@kantorcore/db'
import { eq, and } from 'drizzle-orm'
import { getDb } from '../../../../../lib/db'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const { token } = await params

  // Only allow terminating other sessions belonging to the same user.
  // The current session cannot be terminated this way (use sign-out instead).
  if (token === session.session.token) {
    return NextResponse.json({ error: 'Gunakan sign-out untuk sesi ini.' }, { status: 400 })
  }

  const db = getDb()
  const result = await db
    .delete(sessions)
    .where(and(eq(sessions.token, token), eq(sessions.userId, session.user.id)))
    .returning({ token: sessions.token })

  if (!result.length) return NextResponse.json({ error: 'Sesi tidak ditemukan.' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
