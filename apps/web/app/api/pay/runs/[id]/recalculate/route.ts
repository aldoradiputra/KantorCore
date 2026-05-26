import { NextResponse } from 'next/server'
import { getCurrentSession } from '../../../../../../lib/auth'
import { getCurrentTenant } from '../../../../../../lib/tenants'
import { recalculatePayRun } from '../../../../../../lib/payroll'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant.' }, { status: 403 })

  const result = await recalculatePayRun(ctx.tenant.id, id)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
