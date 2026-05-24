import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { createCustomRole, listCustomRoles } from '../../../lib/platform/policy'

export async function GET() {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const list = await listCustomRoles(ctx.tenant.id)
  return NextResponse.json({ roles: list })
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
  if (!body || typeof body.key !== 'string' || typeof body.name !== 'string') {
    return NextResponse.json({ error: 'key dan name wajib diisi.' }, { status: 400 })
  }

  const result = await createCustomRole({
    tenantId: ctx.tenant.id,
    key: body.key,
    name: body.name,
    description: body.description,
  })

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 })
  return NextResponse.json({ role: result.role }, { status: 201 })
}
