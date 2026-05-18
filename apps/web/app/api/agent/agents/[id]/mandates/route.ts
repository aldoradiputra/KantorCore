import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../../lib/requireSession'
import { getAgent, grantMandate, listMandates } from '../../../../../../lib/agent'
import { recordAudit, auditMetaFromRequest } from '../../../../../../lib/audit'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { id } = await params
  const list = await listMandates(result.ctx.tenant.id, id)
  return NextResponse.json({ mandates: list })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { id: agentId } = await params

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }
  const { toolName } = body as Record<string, unknown>
  if (typeof toolName !== 'string' || !toolName) {
    return NextResponse.json({ error: 'Missing toolName.' }, { status: 400 })
  }

  const agent = await getAgent(result.ctx.tenant.id, agentId)
  if (!agent) return NextResponse.json({ error: 'Agen tidak ditemukan.' }, { status: 404 })

  const granted = await grantMandate({
    tenantId: result.ctx.tenant.id,
    agentId,
    toolName,
    grantedBy: result.ctx.session.user.id,
  })
  if (!granted.ok) return NextResponse.json({ error: granted.error }, { status: 400 })

  await recordAudit({
    tenantId: result.ctx.tenant.id,
    actorUserId: result.ctx.session.user.id,
    action: 'agent.mandate_grant',
    resourceType: 'agent',
    resourceId: agentId,
    payload: { toolName },
    ...auditMetaFromRequest(req),
  })

  return NextResponse.json({ mandate: granted.mandate }, { status: 201 })
}
