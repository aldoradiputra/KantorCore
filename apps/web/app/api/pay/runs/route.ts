import { NextResponse } from 'next/server'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { listPayRuns, createPayRun } from '../../../../lib/payroll'

export async function GET() {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant.' }, { status: 403 })

  const runs = await listPayRuns(ctx.tenant.id)
  return NextResponse.json({ runs })
}

export async function POST(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant.' }, { status: 403 })

  const body = await req.json().catch(() => null) as {
    periodStart?: string
    periodEnd?: string
    description?: string | null
    populateActiveEmployees?: boolean
  } | null
  if (!body?.periodStart || !body.periodEnd) {
    return NextResponse.json({ error: 'Periode wajib diisi.' }, { status: 400 })
  }
  if (body.periodEnd < body.periodStart) {
    return NextResponse.json({ error: 'Akhir periode harus setelah awal periode.' }, { status: 400 })
  }

  try {
    const run = await createPayRun({
      tenantId: ctx.tenant.id,
      userId: session.user.id,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
      description: body.description ?? null,
      populateActiveEmployees: body.populateActiveEmployees ?? false,
    })
    return NextResponse.json({ id: run.id, code: run.code })
  } catch (err) {
    console.error('[POST /api/pay/runs]', err)
    return NextResponse.json({ error: 'Gagal membuat pay run.' }, { status: 500 })
  }
}
