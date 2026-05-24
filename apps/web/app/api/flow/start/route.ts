import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { startInstance } from '../../../../lib/platform/workflow-executor'

export async function POST(req: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body.processSlug !== 'string') {
    return NextResponse.json({ error: 'processSlug wajib diisi.' }, { status: 400 })
  }

  const result = await startInstance({
    tenantId: ctx.tenant.id,
    processSlug: body.processSlug,
    triggerRecordType: body.triggerRecordType,
    triggerRecordId: body.triggerRecordId,
    actorId: session.user.id,
    context: body.context,
  })

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 })
  return NextResponse.json({ instance: result.instance }, { status: 201 })
}
