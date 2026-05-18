import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { changePassword } from '../../../../lib/settings'

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const body = await req.json().catch(() => null)
  if (!body || typeof body.currentPassword !== 'string' || typeof body.newPassword !== 'string') {
    return NextResponse.json({ error: 'Missing fields.' }, { status: 400 })
  }
  const updated = await changePassword(result.ctx.session.user.id, body.currentPassword, body.newPassword)
  if (!updated.ok) return NextResponse.json({ error: updated.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
