import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import { toggleTriggerRule, deleteTriggerRule, listTriggerLogs } from '../../../../../lib/triggers'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params
  const body = await req.json()

  if (body.status !== 'active' && body.status !== 'inactive') {
    return NextResponse.json({ error: 'status harus active atau inactive.' }, { status: 400 })
  }

  const res = await toggleTriggerRule(ctx.tenant.id, id, body.status)
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 404 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params
  const res = await deleteTriggerRule(ctx.tenant.id, id)
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 404 })
  return NextResponse.json({ ok: true })
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params
  const logs = await listTriggerLogs(ctx.tenant.id, id)
  return NextResponse.json(logs)
}
