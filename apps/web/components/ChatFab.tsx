'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const POLL_MS = 30_000

function IconChat() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

export default function ChatFab() {
  const pathname = usePathname()
  const router   = useRouter()
  const [unread, setUnread] = useState(0)
  const [hovered, setHovered] = useState(false)

  // Don't show the FAB when already in the chat module
  const hidden = pathname?.startsWith('/chat')

  useEffect(() => {
    if (hidden) return
    async function load() {
      try {
        const res = await fetch('/api/chat/unread')
        if (!res.ok) return
        const data = (await res.json()) as { count: number }
        setUnread(data.count ?? 0)
      } catch {
        /* API not yet available — degrade silently */
      }
    }
    load()
    const id = setInterval(load, POLL_MS)
    return () => clearInterval(id)
  }, [hidden])

  if (hidden) return null

  return (
    <button
      type="button"
      aria-label={unread > 0 ? `Chat — ${unread} pesan belum dibaca` : 'Buka Chat'}
      title={unread > 0 ? `${unread} pesan belum dibaca` : 'Chat'}
      onClick={() => router.push('/chat')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: 52,
        height: 52,
        borderRadius: '50%',
        background: hovered ? 'var(--indigo)' : 'var(--navy)',
        color: 'var(--white, #fff)',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: hovered
          ? '0 6px 24px rgba(59,79,196,0.45)'
          : '0 4px 16px rgba(26,43,90,0.32)',
        transition: 'background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease',
        transform: hovered ? 'scale(1.08)' : 'scale(1)',
        zIndex: 500,
        flexShrink: 0,
      }}
    >
      <IconChat />

      {unread > 0 && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            background: '#e53e3e',
            border: '2px solid var(--surface, #fff)',
            color: '#fff',
            font: '700 9px/1 var(--font-sans)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 3px',
          }}
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  )
}
