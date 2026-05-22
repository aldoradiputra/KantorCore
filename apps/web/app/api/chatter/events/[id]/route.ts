import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import { markActivityDone } from '../../../../../lib/chatter'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params

  const body = await req.json().catch(() => ({}))
  const event = await markActivityDone(ctx.tenant.id, id, body.note ?? null)
  return NextResponse.json(event)
}
