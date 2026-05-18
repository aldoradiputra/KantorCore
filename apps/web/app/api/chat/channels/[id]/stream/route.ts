import { requireAuthedContext } from '../../../../../../lib/requireSession'
import { subscribe } from '../../../../../../lib/chat-pubsub'
import { getDb } from '../../../../../../lib/db'
import { channels } from '@kantr/db'
import { and, eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'
// SSE streams hold the request open. Node runtime supports this; the Edge
// runtime would too but we standardise on Node for DB access.
export const runtime = 'nodejs'

const HEARTBEAT_MS = 25_000

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireAuthedContext()
  if (!result.ok) return result.response

  const { id } = await params

  // Tenant ownership check before opening the stream.
  const rows = await getDb()
    .select({ id: channels.id })
    .from(channels)
    .where(and(eq(channels.id, id), eq(channels.tenantId, result.ctx.tenant.id)))
    .limit(1)
  if (rows.length === 0) {
    return new Response('Not found.', { status: 404 })
  }

  const encoder = new TextEncoder()
  let unsubscribe: (() => void) | null = null
  let heartbeat: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          /* stream closed */
        }
      }
      send({ type: 'ready' })

      unsubscribe = subscribe(id, (event) => {
        send({ type: 'message', ...event })
      })

      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`))
        } catch {
          /* stream closed */
        }
      }, HEARTBEAT_MS)
    },
    cancel() {
      unsubscribe?.()
      if (heartbeat) clearInterval(heartbeat)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

