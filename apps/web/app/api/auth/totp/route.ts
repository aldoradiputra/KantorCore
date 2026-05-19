import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { verifyPassword } from '@kantorcore/auth'
import { users } from '@kantorcore/db'
import { eq } from 'drizzle-orm'
import { getDb } from '../../../../lib/db'

/** DELETE — disable TOTP (requires current password confirmation). */
export async function DELETE(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response

  const body = await req.json().catch(() => null)
  if (!body || typeof body.password !== 'string') {
    return NextResponse.json({ error: 'Konfirmasi kata sandi diperlukan.' }, { status: 400 })
  }

  const db = getDb()
  const [user] = await db
    .select({ passwordHash: users.passwordHash, totpEnabled: users.totpEnabled })
    .from(users)
    .where(eq(users.id, result.ctx.session.user.id))
    .limit(1)

  if (!user) return NextResponse.json({ error: 'User tidak ditemukan.' }, { status: 404 })
  if (!user.totpEnabled) {
    return NextResponse.json({ error: '2FA tidak aktif.' }, { status: 400 })
  }

  const ok = await verifyPassword(body.password, user.passwordHash)
  if (!ok) return NextResponse.json({ error: 'Kata sandi salah.' }, { status: 401 })

  await db
    .update(users)
    .set({ totpEnabled: false, totpSecret: null, backupCodeHashes: null })
    .where(eq(users.id, result.ctx.session.user.id))

  return NextResponse.json({ ok: true })
}
