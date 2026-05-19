import { NextResponse } from 'next/server'
import { totpChallenges, users, sessions } from '@kantorcore/db'
import { eq, and, gt } from 'drizzle-orm'
import { getDb } from '../../../../../lib/db'
import { createSession } from '@kantorcore/auth/server'
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '@kantorcore/auth'
import { cookies } from 'next/headers'
import { verifyTotp, verifyAndConsumeBackupCode } from '../../../../../lib/totp'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body.challengeToken !== 'string' || typeof body.code !== 'string') {
    return NextResponse.json({ error: 'Missing fields.' }, { status: 400 })
  }

  const db = getDb()
  const [challenge] = await db
    .select({ userId: totpChallenges.userId, used: totpChallenges.used })
    .from(totpChallenges)
    .where(
      and(
        eq(totpChallenges.token, body.challengeToken),
        gt(totpChallenges.expiresAt, new Date()),
      ),
    )
    .limit(1)

  if (!challenge || challenge.used) {
    return NextResponse.json({ error: 'Sesi verifikasi tidak valid atau kedaluwarsa.' }, { status: 401 })
  }

  const [user] = await db
    .select({ totpSecret: users.totpSecret, totpEnabled: users.totpEnabled, backupCodeHashes: users.backupCodeHashes })
    .from(users)
    .where(eq(users.id, challenge.userId))
    .limit(1)

  if (!user?.totpEnabled || !user.totpSecret) {
    return NextResponse.json({ error: 'TOTP tidak dikonfigurasi.' }, { status: 400 })
  }

  const code = body.code.replace(/\s/g, '')
  let verified = verifyTotp(user.totpSecret, code)

  // Allow backup code as fallback
  if (!verified && user.backupCodeHashes && user.backupCodeHashes.length > 0) {
    const { valid, remaining } = verifyAndConsumeBackupCode(code, user.backupCodeHashes)
    if (valid) {
      verified = true
      await db.update(users).set({ backupCodeHashes: remaining }).where(eq(users.id, challenge.userId))
    }
  }

  if (!verified) {
    return NextResponse.json({ error: 'Kode salah.' }, { status: 401 })
  }

  // Mark challenge as used
  await db.update(totpChallenges).set({ used: true }).where(eq(totpChallenges.token, body.challengeToken))

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const userAgent = req.headers.get('user-agent') ?? null

  const session = await createSession(db, challenge.userId)
  await db
    .update(sessions)
    .set({ ip, userAgent, lastSeenAt: new Date() })
    .where(eq(sessions.token, session.token))

  const cookieStore = await cookies()
  const secure = process.env.NODE_ENV === 'production'
  cookieStore.set(SESSION_COOKIE_NAME, session.token, sessionCookieOptions(session.expiresAt, secure))

  return NextResponse.json({ ok: true })
}
