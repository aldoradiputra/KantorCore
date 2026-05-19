import { NextResponse } from 'next/server'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { listTimesheetEntries, createTimesheetEntry } from '../../../../lib/timesheet'

export async function GET(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant.' }, { status: 403 })

  const url = new URL(req.url)
  const employeeId = url.searchParams.get('employeeId') ?? undefined
  const projectId = url.searchParams.get('projectId') ?? undefined
  const dateFrom = url.searchParams.get('dateFrom') ?? undefined
  const dateTo = url.searchParams.get('dateTo') ?? undefined

  const list = await listTimesheetEntries(ctx.tenant.id, { employeeId, projectId, dateFrom, dateTo })
  return NextResponse.json({ entries: list })
}

export async function POST(req: Request) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant.' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }

  const result = await createTimesheetEntry(ctx.tenant.id, session.user.id, body as never)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ entry: result.entry }, { status: 201 })
}
