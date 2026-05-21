import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../../lib/requireSession'
import { listTicketActions, recordTicketAction } from '../../../../../../lib/helpdesk'
import type { TicketActionType } from '../../../../../../lib/helpdesk'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const { id } = await params
  const actions = await listTicketActions(ctx.tenant.id, id)
  return NextResponse.json(actions)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const { id } = await params
  const body = await req.json()
  const { actionType, payload } = body as { actionType: TicketActionType; payload?: Record<string, unknown> }

  if (!actionType) return NextResponse.json({ error: 'actionType diperlukan.' }, { status: 400 })

  const action = await recordTicketAction(
    ctx.tenant.id,
    id,
    actionType,
    ctx.session.user.id,
    payload ?? {},
  )
  return NextResponse.json(action, { status: 201 })
}
