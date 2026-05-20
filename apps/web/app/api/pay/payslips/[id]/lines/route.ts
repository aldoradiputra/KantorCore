import { NextResponse } from 'next/server'
import { getCurrentSession } from '../../../../../../lib/auth'
import { getCurrentTenant } from '../../../../../../lib/tenants'
import { setPayslipLines } from '../../../../../../lib/payroll'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant.' }, { status: 403 })

  const body = await req.json().catch(() => null) as { lines?: { kind: 'earning' | 'deduction'; name: string; amount: number }[] } | null
  if (!body || !Array.isArray(body.lines)) {
    return NextResponse.json({ error: 'Format tidak valid.' }, { status: 400 })
  }

  const result = await setPayslipLines(ctx.tenant.id, id, body.lines)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
