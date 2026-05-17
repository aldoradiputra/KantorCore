import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../../../lib/requireSession'
import { listMessages, sendMessage } from '../../../../../../lib/chat'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { id } = await params
  const messages = await listMessages({
    tenantId: result.ctx.tenant.id,
    channelId: id,
  })
  return NextResponse.json({ messages })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body.' }, { status: 400 })
  }
  const { body: text } = body as Record<string, unknown>
  if (typeof text !== 'string') {
    return NextResponse.json({ error: 'Missing body.' }, { status: 400 })
  }

  const { id } = await params
  const sent = await sendMessage({
    tenantId: result.ctx.tenant.id,
    channelId: id,
    authorId: result.ctx.session.user.id,
    body: text,
  })
  if (!sent.ok) return NextResponse.json({ error: sent.error }, { status: 400 })
  return NextResponse.json({ message: sent.message })
}
