import { NextResponse } from 'next/server'
import { getCurrentSession } from '../../../../../../../lib/auth'
import { getCurrentTenant } from '../../../../../../../lib/tenants'
import { setBillLineTaxes } from '../../../../../../../lib/finance'

export async function PUT(req: Request, { params }: { params: Promise<{ lineId: string }> }) {
  const { lineId } = await params
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant.' }, { status: 403 })

  const body = await req.json().catch(() => null) as { taxIds?: string[] } | null
  if (!body || !Array.isArray(body.taxIds)) {
    return NextResponse.json({ error: 'Format tidak valid.' }, { status: 400 })
  }
  await setBillLineTaxes(ctx.tenant.id, lineId, body.taxIds)
  return NextResponse.json({ ok: true })
}
