import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../../../lib/requireSession'
import { revokeMandate } from '../../../../../../../lib/agent'
import { recordAudit, auditMetaFromRequest } from '../../../../../../../lib/audit'

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; toolName: string }> },
) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { id, toolName } = await params
  const decoded = decodeURIComponent(toolName)
  await revokeMandate(result.ctx.tenant.id, id, decoded)

  await recordAudit({
    tenantId: result.ctx.tenant.id,
    actorUserId: result.ctx.session.user.id,
    action: 'agent.mandate_revoke',
    resourceType: 'agent',
    resourceId: id,
    payload: { toolName: decoded },
    ...auditMetaFromRequest(req),
  })

  return NextResponse.json({ ok: true })
}
