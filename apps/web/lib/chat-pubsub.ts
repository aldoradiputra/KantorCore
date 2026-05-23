import type { MessageWithAuthor } from './chat'

// Process-local pub/sub for chat fan-out. Single-process dev only — in
// production this needs Postgres LISTEN/NOTIFY (or Redis/NATS) so that POSTs
// landing on one worker can reach SSE subscribers on another. Tracked in
// ADR-011 work (event bus).
type Subscriber = (event: MessageWithAuthor) => void

const subscribers = new Map<string, Set<Subscriber>>()

export function subscribe(channelId: string, fn: Subscriber): () => void {
  let set = subscribers.get(channelId)
  if (!set) {
    set = new Set()
    subscribers.set(channelId, set)
  }
  set.add(fn)
  return () => {
    set!.delete(fn)
    if (set!.size === 0) subscribers.delete(channelId)
  }
}

export function publish(channelId: string, event: MessageWithAuthor): void {
  const set = subscribers.get(channelId)
  if (!set) return
  for (const fn of set) {
    try {
      fn(event)
    } catch {
      /* one bad subscriber shouldn't break the rest */
    }
  }
}
