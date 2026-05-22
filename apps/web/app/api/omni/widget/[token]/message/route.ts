import { NextResponse } from 'next/server'
import { getDb } from '../../../../../../lib/db'
import { omniChannels, omniWidgetSessions } from '@kantorcore/db'
import { eq, and } from 'drizzle-orm'
import {
  ingestMessage,
  linkSessionToConv,
  touchWidgetSession,
  widgetToken,
} from '../../../../../../lib/omni'

export const runtime = 'nodejs'

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const body = await req.json().catch(() => ({}))

  const sessionId: string = body.sessionId ?? ''
  const text: string = (body.text ?? '').toString().trim()
  if (!sessionId || !text) {
    return NextResponse.json({ error: 'sessionId dan text diperlukan.' }, { status: 400 })
  }

  const db = getDb()

  // Verify token → channel
  const channels = await db.select().from(omniChannels)
    .where(and(eq(omniChannels.type, 'web_chat'), eq(omniChannels.active, true)))
  const channel = channels.find((c) => widgetToken(c.id) === token)
  if (!channel) return NextResponse.json({ error: 'Widget tidak ditemukan.' }, { status: 404 })

  // Verify session belongs to this channel
  const [session] = await db.select().from(omniWidgetSessions)
    .where(and(eq(omniWidgetSessions.id, sessionId), eq(omniWidgetSessions.channelId, channel.id)))
    .limit(1)
  if (!session) return NextResponse.json({ error: 'Sesi tidak valid.' }, { status: 403 })

  await touchWidgetSession(channel.tenantId, sessionId)

  const { message, convId, isNew: _ } = await ingestMessage(channel.tenantId, {
    channelId: channel.id,
    direction: 'inbound',
    body: text,
    fromName: session.visitorName ?? 'Pengunjung',
    contactIdentifier: session.visitorEmail ?? undefined,
    externalRef: sessionId,
    contactName: session.visitorName ?? null,
    subject: 'Pesan dari web chat',
  })

  // Keep session linked to conversation
  if (!session.convId) await linkSessionToConv(channel.tenantId, sessionId, convId)

  return NextResponse.json({ messageId: message.id, convId }, { status: 201 })
}
