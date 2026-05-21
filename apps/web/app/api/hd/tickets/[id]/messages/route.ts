import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../../lib/requireSession'
import { listMessages, addMessage } from '../../../../../../lib/helpdesk'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params

  const messages = await listMessages(ctx.tenant.id, id)
  return NextResponse.json(messages)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const { id } = await params

  const body = await req.json()
  const { body: msgBody, isInternal } = body

  if (!msgBody?.trim()) return NextResponse.json({ error: 'Pesan diperlukan.' }, { status: 400 })

  const msg = await addMessage(ctx.tenant.id, {
    ticketId: id,
    body: msgBody.trim(),
    authorUserId: ctx.session.user.id,
    authorContactId: null,
    authorName: ctx.session.user.name,
    isInternal: !!isInternal,
  })

  return NextResponse.json(msg, { status: 201 })
}
