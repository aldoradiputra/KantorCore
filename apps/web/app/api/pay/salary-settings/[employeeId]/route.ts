import { NextResponse } from 'next/server'
import { getCurrentSession } from '../../../../../lib/auth'
import { getCurrentTenant } from '../../../../../lib/tenants'
import { getEmployeeSalarySettings, upsertEmployeeSalarySettings } from '../../../../../lib/payroll'

export async function GET(_req: Request, { params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant.' }, { status: 403 })

  const data = await getEmployeeSalarySettings(ctx.tenant.id, employeeId)
  return NextResponse.json(data)
}

export async function PUT(req: Request, { params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant.' }, { status: 403 })

  const body = await req.json()

  if (typeof body.baseSalary !== 'number' || body.baseSalary < 0) {
    return NextResponse.json({ error: 'baseSalary wajib diisi.' }, { status: 400 })
  }
  if (!body.effectiveDate) {
    return NextResponse.json({ error: 'effectiveDate wajib diisi.' }, { status: 400 })
  }

  const data = await upsertEmployeeSalarySettings({
    tenantId: ctx.tenant.id,
    employeeId,
    baseSalary: body.baseSalary,
    ptkpStatus: body.ptkpStatus ?? 'TK0',
    taxScheme: body.taxScheme ?? 'gross',
    jkkTier: body.jkkTier ?? 'very_low',
    bpjsKesEnabled: body.bpjsKesEnabled !== false,
    bpjsKetEnabled: body.bpjsKetEnabled !== false,
    jpEnabled: body.jpEnabled !== false,
    fixedAllowances: body.fixedAllowances ?? [],
    effectiveDate: body.effectiveDate,
  })
  return NextResponse.json(data)
}
