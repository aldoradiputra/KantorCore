import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { createApproval, listApprovals, type ApprovalStatus } from '../../../lib/platform/approvals'

export async function GET(req: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const status = req.nextUrl.searchParams.get('status') as ApprovalStatus | null
  const list = await listApprovals(ctx.tenant.id, status ?? undefined)
  return NextResponse.json({ approvals: list })
}

export async function POST(req: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (
    !body ||
    typeof body.resourceType !== 'string' ||
    typeof body.resourceId !== 'string' ||
    typeof body.action !== 'string' ||
    typeof body.title !== 'string'
  ) {
    return NextResponse.json(
      { error: 'resourceType, resourceId, action, title wajib diisi.' },
      { status: 400 },
    )
  }

  const approval = await createApproval({
    tenantId: ctx.tenant.id,
    resourceType: body.resourceType,
    resourceId: body.resourceId,
    action: body.action,
    title: body.title,
    description: body.description,
    requesterId: session.user.id,
    requiredRole: body.requiredRole,
    context: body.context ?? {},
  })

  return NextResponse.json({ approval }, { status: 201 })
}
