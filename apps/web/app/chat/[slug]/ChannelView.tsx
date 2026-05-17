'use client'

import { useEffect, useRef, useState } from 'react'
import type { Channel } from '@kantr/db'

interface SerializedMessage {
  message: {
    id: string
    body: string
    authorId: string
    createdAt: string
    editedAt: string | null
  }
  author: { id: string; name: string; email: string }
}

const POLL_INTERVAL_MS = 5000

export default function ChannelView({
  channel,
  currentUserId,
  initialMessages,
}: {
  channel: Channel
  currentUserId: string
  initialMessages: unknown[]
}) {
  // Normalise dates the server serialised as strings.
  const [messages, setMessages] = useState<SerializedMessage[]>(() =>
    (initialMessages as SerializedMessage[]).map((m) => ({
      ...m,
      message: { ...m.message, createdAt: String(m.message.createdAt) },
    })),
  )
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages.length])

  // Refresh-based "realtime" until IS-CHAT Phase 12 ships WebSocket transport.
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/chat/channels/${channel.id}/messages`)
        if (!res.ok) return
        const data = (await res.json()) as { messages: SerializedMessage[] }
        setMessages(data.messages)
      } catch {
        /* network blip — next tick will retry */
      }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [channel.id])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = body.trim()
    if (!text || sending) return
    setSending(true)
    setError(null)
    const res = await fetch(`/api/chat/channels/${channel.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text }),
    })
    if (res.ok) {
      const data = (await res.json()) as { message: SerializedMessage['message'] }
      // Optimistic append — poll will reconcile if anything's off.
      setMessages((prev) => [
        ...prev,
        {
          message: data.message,
          author: { id: currentUserId, name: 'Anda', email: '' },
        },
      ])
      setBody('')
    } else {
      const data = await res.json().catch(() => ({ error: 'Gagal mengirim.' }))
      setError(data.error ?? 'Gagal mengirim.')
    }
    setSending(false)
  }

  return (
    <>
      <div
        style={{
          padding: 'var(--s-3) var(--s-4)',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          flexShrink: 0,
        }}
      >
        <div style={{ font: '600 14px/1 var(--font-sans)', color: 'var(--fg-1)' }}>
          # {channel.slug}
        </div>
        {channel.description && (
          <div style={{ font: '400 12px/1.4 var(--font-sans)', color: 'var(--fg-3)', marginTop: 4 }}>
            {channel.description}
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--s-4)',
          background: 'var(--bg)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--s-3)',
        }}
      >
        {messages.length === 0 ? (
          <p style={{ font: '400 13px/1.5 var(--font-sans)', color: 'var(--fg-3)', textAlign: 'center', marginTop: 'var(--s-6)' }}>
            Belum ada pesan di kanal ini. Kirim yang pertama.
          </p>
        ) : (
          messages.map((m) => (
            <MessageRow
              key={m.message.id}
              author={m.author.name || m.author.email || 'Anonim'}
              body={m.message.body}
              createdAt={m.message.createdAt}
              isOwn={m.message.authorId === currentUserId}
            />
          ))
        )}
      </div>

      <form
        onSubmit={onSubmit}
        style={{
          padding: 'var(--s-3) var(--s-4)',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--s-2)',
          flexShrink: 0,
        }}
      >
        {error && (
          <div style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--amber)' }}>{error}</div>
        )}
        <div style={{ display: 'flex', gap: 'var(--s-2)' }}>
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`Kirim pesan ke #${channel.slug}`}
            style={{
              flex: 1,
              height: 36,
              padding: '0 12px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)',
              background: 'var(--bg)',
              font: '400 14px/1 var(--font-sans)',
              color: 'var(--fg-1)',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={sending || !body.trim()}
            style={{
              height: 36,
              padding: '0 16px',
              background: 'var(--indigo)',
              color: 'var(--white)',
              border: 'none',
              borderRadius: 'var(--r-sm)',
              font: '600 13px/1 var(--font-sans)',
              cursor: sending || !body.trim() ? 'not-allowed' : 'pointer',
              opacity: sending || !body.trim() ? 0.6 : 1,
            }}
          >
            Kirim
          </button>
        </div>
      </form>
    </>
  )
}

function MessageRow({
  author,
  body,
  createdAt,
  isOwn,
}: {
  author: string
  body: string
  createdAt: string
  isOwn: boolean
}) {
  const time = new Date(createdAt).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--s-2)' }}>
        <span style={{ font: '600 13px/1 var(--font-sans)', color: isOwn ? 'var(--indigo)' : 'var(--fg-1)' }}>
          {author}
        </span>
        <span style={{ font: '400 11px/1 var(--font-sans)', color: 'var(--fg-3)' }}>{time}</span>
      </div>
      <div style={{ font: '400 14px/1.5 var(--font-sans)', color: 'var(--fg-1)', whiteSpace: 'pre-wrap' }}>
        {body}
      </div>
    </div>
  )
}
