import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import { getRecord, updateRecord, deleteRecord } from '../../../../../lib/platform/records'
import { getModel } from '../../../../../lib/platform/registry'

export async function GET(_req: Request, { params }: { params: Promise<{ model: string; id: string }> }) {
  const { model, id } = await params
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const def = await getModel(decodeURIComponent(model))
  if (!def) return NextResponse.json({ error: 'Unknown model.' }, { status: 404 })
  try {
    const record = await getRecord(ctx.tenant.id, def.model.key, id)
    if (!record) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
    return NextResponse.json({ record })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ model: string; id: string }> }) {
  const { model, id } = await params
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const def = await getModel(decodeURIComponent(model))
  if (!def) return NextResponse.json({ error: 'Unknown model.' }, { status: 404 })
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })

  try {
    const record = await updateRecord({
      tenantId: ctx.tenant.id,
      modelKey: def.model.key,
      actorUserId: ctx.session.user.id,
      id,
      values: body.values ?? {},
      custom: body.custom,
    })
    return NextResponse.json({ record })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ model: string; id: string }> }) {
  const { model, id } = await params
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const def = await getModel(decodeURIComponent(model))
  if (!def) return NextResponse.json({ error: 'Unknown model.' }, { status: 404 })
  try {
    await deleteRecord({
      tenantId: ctx.tenant.id,
      modelKey: def.model.key,
      id,
      actorUserId: ctx.session.user.id,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
