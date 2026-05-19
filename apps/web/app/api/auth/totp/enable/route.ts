import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import { verifyTotp, generateBackupCodes, hashBackupCode } from '../../../../../lib/totp'
import { users } from '@kantorcore/db'
import { eq } from 'drizzle-orm'
import { getDb } from '../../../../../lib/db'

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response

  const body = await req.json().catch(() => null)
  if (!body || typeof body.code !== 'string') {
    return NextResponse.json({ error: 'Missing code.' }, { status: 400 })
  }

  const db = getDb()
  const [user] = await db
    .select({ totpSecret: users.totpSecret, totpEnabled: users.totpEnabled })
    .from(users)
    .where(eq(users.id, result.ctx.session.user.id))
    .limit(1)

  if (!user?.totpSecret) {
    return NextResponse.json({ error: 'Setup TOTP lebih dulu.' }, { status: 400 })
  }
  if (user.totpEnabled) {
    return NextResponse.json({ error: '2FA sudah aktif.' }, { status: 400 })
  }
  if (!verifyTotp(user.totpSecret, body.code.replace(/\s/g, ''))) {
    return NextResponse.json({ error: 'Kode tidak valid.' }, { status: 400 })
  }

  const backupCodes = generateBackupCodes()
  const backupCodeHashes = backupCodes.map(hashBackupCode)

  await db
    .update(users)
    .set({ totpEnabled: true, backupCodeHashes })
    .where(eq(users.id, result.ctx.session.user.id))

  return NextResponse.json({ ok: true, backupCodes })
}
