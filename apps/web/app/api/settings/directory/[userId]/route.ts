import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import { upsertDirectoryProfile } from '../../../../../lib/admin'

export async function PATCH(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

  const { userId } = await params
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })

  const profile = await upsertDirectoryProfile({
    tenantId: ctx.tenant.id,
    userId,
    department: typeof body.department === 'string' ? body.department : undefined,
    jobTitle: typeof body.jobTitle === 'string' ? body.jobTitle : undefined,
    managerId: body.managerId === null ? null : typeof body.managerId === 'string' ? body.managerId : undefined,
    employeeId: typeof body.employeeId === 'string' ? body.employeeId : undefined,
    phone: typeof body.phone === 'string' ? body.phone : undefined,
  })
  return NextResponse.json({ profile })
}
