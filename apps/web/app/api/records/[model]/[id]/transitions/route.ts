import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../../lib/requireSession'
import { applyTransition } from '../../../../../../lib/platform/status-machine'
import { getModel } from '../../../../../../lib/platform/registry'
import { recordAudit } from '../../../../../../lib/audit'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ model: string; id: string }> },
) {
  const { model, id } = await params
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const def = await getModel(decodeURIComponent(model))
  if (!def) return NextResponse.json({ error: 'Unknown model.' }, { status: 404 })

  const body = await req.json().catch(() => null)
  const toState = typeof body?.toState === 'string' ? body.toState : null
  if (!toState) return NextResponse.json({ error: 'toState required.' }, { status: 400 })

  try {
    const transition = await applyTransition({
      tenantId: ctx.tenant.id,
      modelKey: def.model.key,
      recordId: id,
      toState,
      actorRole: ctx.membership.role,
    })
    if (def.model.hasAudit) {
      void recordAudit({
        tenantId: ctx.tenant.id,
        actorUserId: ctx.session.user.id,
        action: `${def.model.key}.transition`,
        resourceType: def.model.key,
        resourceId: id,
        payload: { ...transition },
      })
    }
    return NextResponse.json({ transition })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
