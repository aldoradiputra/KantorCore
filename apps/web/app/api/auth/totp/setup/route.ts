import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import { generateTotpSecret, buildTotpUri } from '../../../../../lib/totp'
import { users } from '@kantorcore/db'
import { eq } from 'drizzle-orm'
import { getDb } from '../../../../../lib/db'

export async function POST() {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response

  const secret = generateTotpSecret()
  const uri = buildTotpUri(secret, result.ctx.session.user.email)

  // Persist the pending secret (not yet enabled). It will be confirmed during /enable.
  await getDb()
    .update(users)
    .set({ totpSecret: secret, totpEnabled: false })
    .where(eq(users.id, result.ctx.session.user.id))

  return NextResponse.json({ secret, uri })
}
