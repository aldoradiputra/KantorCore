import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import { deleteTenantModel } from '../../../../../lib/platform/tenant-models'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const r = await deleteTenantModel(ctx.tenant.id, id)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 422 })
  return NextResponse.json({ ok: true })
}
