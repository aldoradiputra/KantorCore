import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listLeaveRequests, createLeaveRequest, getLeaveAroundToday } from '../../../../lib/hr-leave'

// GET /api/hr/time-off?mode=around (for popover) or default list
export async function GET(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const { searchParams } = new URL(req.url)
  if (searchParams.get('mode') === 'around') {
    const data = await getLeaveAroundToday(ctx.tenant.id)
    return NextResponse.json(data)
  }

  const limit  = Math.min(Number(searchParams.get('limit')  ?? 100), 200)
  const offset = Number(searchParams.get('offset') ?? 0)
  const data = await listLeaveRequests(ctx.tenant.id, limit, offset)
  return NextResponse.json(data)
}

// POST /api/hr/time-off — create a leave request
export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })

  const r = await createLeaveRequest({
    tenantId: ctx.tenant.id,
    employeeId: body.employeeId,
    createdBy: ctx.session.user.id,
    leaveType: body.leaveType,
    startDate: body.startDate,
    endDate: body.endDate,
    halfDay: !!body.halfDay,
    notes: body.notes,
  })
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 422 })
  return NextResponse.json({ id: r.id }, { status: 201 })
}
