import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { updateDisplayName } from '../../../../lib/settings'

export async function PATCH(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const body = await req.json().catch(() => null)
  if (!body || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'Missing name.' }, { status: 400 })
  }
  const updated = await updateDisplayName(result.ctx.session.user.id, body.name)
  if (!updated.ok) return NextResponse.json({ error: updated.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
