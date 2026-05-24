import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { createPolicy, listPolicies } from '../../../lib/platform/policy'

export async function GET() {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const list = await listPolicies(ctx.tenant.id)
  return NextResponse.json({ policies: list })
}

export async function POST(req: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant' }, { status: 403 })
  if (ctx.membership.role !== 'owner' && ctx.membership.role !== 'admin') {
    return NextResponse.json({ error: 'Hanya admin/owner.' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body kosong.' }, { status: 400 })

  const result = await createPolicy({
    tenantId: ctx.tenant.id,
    name: body.name,
    description: body.description,
    resource: body.resource,
    action: body.action,
    effect: body.effect ?? 'allow',
    principalType: body.principalType ?? 'any',
    principalId: body.principalId,
    conditions: body.conditions,
    priority: body.priority,
  })

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 })
  return NextResponse.json({ policy: result.policy }, { status: 201 })
}
