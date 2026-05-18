'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

function IconAgent() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="11" height="9" rx="2" />
      <path d="M5 4V3a2.5 2.5 0 0 1 5 0v1" />
      <circle cx="5.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

const POLL_MS = 30_000

export default function AgentInboxPill() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/agent/inbox/count')
        if (!res.ok) return
        const data = (await res.json()) as { count: number }
        setCount(data.count)
      } catch {
        /* network blip */
      }
    }
    load()
    const id = setInterval(load, POLL_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <Link
      href="/agent/inbox"
      title="Agent Inbox"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        height: 32,
        padding: '0 10px',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)',
        background: count > 0 ? 'var(--indigo-light)' : 'transparent',
        color: count > 0 ? 'var(--indigo)' : 'var(--fg-3)',
        font: '500 12px/1 var(--font-sans)',
        textDecoration: 'none',
        flexShrink: 0,
      }}
    >
      <IconAgent />
      <span>Agent</span>
      {count > 0 && (
        <span
          style={{
            minWidth: 18,
            height: 18,
            padding: '0 4px',
            borderRadius: 9,
            background: 'var(--indigo)',
            color: 'var(--white)',
            font: '600 10px/18px var(--font-sans)',
            textAlign: 'center',
          }}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
