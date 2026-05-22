import { getDb } from '../../../../../../lib/db'
import { omniChannels, omniWidgetSessions, omniMessages, omniConversations } from '@kantorcore/db'
import { eq, and, gt } from 'drizzle-orm'
import { widgetToken } from '../../../../../../lib/omni'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Simple SSE long-poll: streams new outbound messages since `after` timestamp.
// The widget polls every 3s using EventSource; each event is a JSON message.

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const url = new URL(req.url)
  const sessionId = url.searchParams.get('sessionId') ?? ''
  const afterParam = url.searchParams.get('after')
  const after = afterParam ? new Date(afterParam) : new Date(0)

  if (!sessionId) {
    return new Response('sessionId diperlukan.', { status: 400 })
  }

  const db = getDb()

  const channels = await db.select().from(omniChannels)
    .where(and(eq(omniChannels.type, 'web_chat'), eq(omniChannels.active, true)))
  const channel = channels.find((c) => widgetToken(c.id) === token)
  if (!channel) return new Response('Widget tidak ditemukan.', { status: 404 })

  const [session] = await db.select().from(omniWidgetSessions)
    .where(and(eq(omniWidgetSessions.id, sessionId), eq(omniWidgetSessions.channelId, channel.id)))
    .limit(1)
  if (!session?.convId) {
    // No conversation yet — return empty SSE stream immediately
    return new Response(`data: ${JSON.stringify([])}\n\n`, {
      headers: {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
      },
    })
  }

  const messages = await db
    .select()
    .from(omniMessages)
    .where(and(
      eq(omniMessages.convId, session.convId),
      eq(omniMessages.direction, 'outbound'),
      gt(omniMessages.sentAt, after),
    ))
    .orderBy(omniMessages.sentAt)

  const payload = messages.map((m) => ({
    id: m.id,
    body: m.body,
    fromName: m.fromName,
    sentAt: m.sentAt,
  }))

  return new Response(`data: ${JSON.stringify(payload)}\n\n`, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
    },
  })
}
