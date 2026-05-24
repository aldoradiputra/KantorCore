import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import { updateView, deleteView } from '../../../../../lib/platform/views'

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })

  const r = await updateView({
    tenantId: ctx.tenant.id,
    id,
    actorUserId: ctx.session.user.id,
    name: body.name,
    columns: body.columns,
    filters: body.filters,
    sorts: body.sorts,
    isDefault: body.isDefault,
  })
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 422 })
  return NextResponse.json({ view: r.view })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const r = await deleteView(ctx.tenant.id, id, ctx.session.user.id)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 422 })
  return NextResponse.json({ ok: true })
}
