import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import { getThread, updateThread, markThreadRead } from '../../../../../lib/email'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params

  const data = await getThread(ctx.tenant.id, id)
  if (!data) return NextResponse.json({ error: 'Tidak ditemukan.' }, { status: 404 })

  await markThreadRead(ctx.tenant.id, id)
  return NextResponse.json(data)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params

  const body = await req.json()
  const patch: { status?: 'open' | 'snoozed' | 'closed'; assignedTo?: string | null } = {}
  if (body.status === 'open' || body.status === 'snoozed' || body.status === 'closed') {
    patch.status = body.status
  }
  if ('assignedTo' in body) {
    patch.assignedTo = body.assignedTo || null
  }

  await updateThread(ctx.tenant.id, id, patch)
  return NextResponse.json({ ok: true })
}
