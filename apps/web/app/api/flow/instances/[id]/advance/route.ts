import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSession } from '../../../../../../lib/auth'
import { getCurrentTenant } from '../../../../../../lib/tenants'
import { advanceHumanStep } from '../../../../../../lib/platform/workflow-executor'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) return NextResponse.json({ error: 'No tenant' }, { status: 403 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body.stepRunId !== 'string') {
    return NextResponse.json({ error: 'stepRunId wajib diisi.' }, { status: 400 })
  }

  const result = await advanceHumanStep({
    tenantId: ctx.tenant.id,
    instanceId: id,
    stepRunId: body.stepRunId,
    actorId: session.user.id,
    notes: body.notes,
  })

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 })
  return NextResponse.json({ ok: true })
}
