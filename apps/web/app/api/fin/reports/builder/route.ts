import { NextResponse } from 'next/server'
import { getCurrentSession } from '../../../../../lib/auth'
import { getCurrentTenant } from '../../../../../lib/tenants'
import { buildReport } from '../../../../../lib/finance-reports'

export async function GET(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const reportType = searchParams.get('report_type') ?? 'balance_sheet'
  const dateFrom   = searchParams.get('date_from') ?? new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)
  const dateTo     = searchParams.get('date_to')   ?? new Date().toISOString().slice(0, 10)

  const data = await buildReport(ctx.tenant.id, reportType, dateFrom, dateTo)
  return NextResponse.json(data)
}
