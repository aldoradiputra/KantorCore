import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { deletePolicy } from '../../../../lib/platform/policy'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant' }, { status: 403 })
  if (ctx.membership.role !== 'owner' && ctx.membership.role !== 'admin') {
    return NextResponse.json({ error: 'Hanya admin/owner.' }, { status: 403 })
  }

  const result = await deletePolicy(ctx.tenant.id, id, session.user.id)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 })
  return NextResponse.json({ ok: true })
}
