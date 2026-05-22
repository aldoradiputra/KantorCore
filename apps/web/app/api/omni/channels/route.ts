import { NextResponse } from 'next/server'
import { requireAuthedContext } from '../../../../lib/requireSession'
import { listChannels, createChannel, widgetToken } from '../../../../lib/omni'

export async function GET() {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result
  const channels = await listChannels(ctx.tenant.id)
  return NextResponse.json(channels.map((c) => ({
    ...c,
    widgetToken: c.type === 'web_chat' ? widgetToken(c.id) : null,
  })))
}

export async function POST(req: Request) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response
  const { ctx } = result

  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  if (!body.name?.trim()) return NextResponse.json({ error: 'Nama diperlukan.' }, { status: 400 })
  if (!body.type) return NextResponse.json({ error: 'Tipe diperlukan.' }, { status: 400 })

  const channel = await createChannel(ctx.tenant.id, {
    name: body.name.trim(),
    type: body.type,
    config: body.config ?? {},
  })
  return NextResponse.json({
    ...channel,
    widgetToken: channel.type === 'web_chat' ? widgetToken(channel.id) : null,
  }, { status: 201 })
}
