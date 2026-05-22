import { NextResponse } from 'next/server'
import { getDb } from '../../../../../../lib/db'
import { omniChannels } from '@kantorcore/db'
import { eq, and } from 'drizzle-orm'
import { createWidgetSession, widgetToken } from '../../../../../../lib/omni'

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const body = await req.json().catch(() => ({}))

  // Find the channel for this token (scan active web_chat channels)
  const db = getDb()
  const channels = await db.select().from(omniChannels)
    .where(and(eq(omniChannels.type, 'web_chat'), eq(omniChannels.active, true)))

  const channel = channels.find((c) => widgetToken(c.id) === token)
  if (!channel) return NextResponse.json({ error: 'Widget tidak ditemukan.' }, { status: 404 })

  const session = await createWidgetSession(channel.tenantId, channel.id, {
    visitorName: body.name ?? undefined,
    visitorEmail: body.email ?? undefined,
    userAgent: req.headers.get('user-agent') ?? undefined,
  })

  const config = channel.config as { greeting?: string; widgetColor?: string }
  return NextResponse.json({
    sessionId: session.id,
    greeting: config.greeting ?? 'Halo! Ada yang bisa kami bantu?',
  }, { status: 201 })
}
