import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../lib/requireSession'
import { upsertPresence, listPresence, markStaleUsersOffline } from '../../../lib/presence'

// GET /api/presence — fetch all tenant member presence
export async function GET() {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  await markStaleUsersOffline(ctx.tenant.id)
  const rows = await listPresence(ctx.tenant.id)
  return NextResponse.json({ presence: rows })
}

// POST /api/presence — heartbeat: upsert caller's status
export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const body = await req.json().catch(() => null)
  const status = body?.status === 'away' ? 'away' : 'online'
  await upsertPresence(ctx.tenant.id, ctx.session.user.id, status)
  return NextResponse.json({ ok: true })
}
