import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../lib/requireSession'
import { getConversation, updateConversation, markConversationRead } from '../../../../../lib/omni'
import type { OmniConvStatus } from '../../../../../lib/omni'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params

  const data = await getConversation(ctx.tenant.id, id)
  if (!data) return NextResponse.json({ error: 'Tidak ditemukan.' }, { status: 404 })

  await markConversationRead(ctx.tenant.id, id)
  return NextResponse.json(data)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params

  const body = await req.json()
  const patch: { status?: OmniConvStatus; assignedTo?: string | null } = {}
  const validStatuses: OmniConvStatus[] = ['open', 'pending', 'resolved', 'snoozed']
  if (body.status && validStatuses.includes(body.status)) patch.status = body.status
  if ('assignedTo' in body) patch.assignedTo = body.assignedTo || null

  await updateConversation(ctx.tenant.id, id, patch)
  return NextResponse.json({ ok: true })
}
