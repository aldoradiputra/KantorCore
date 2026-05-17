import Link from 'next/link'
import type { ReactNode } from 'react'
import type { Channel } from '@kantr/db'

export function ChatShell({
  channels,
  activeSlug,
  tenantName,
  userInitials,
  children,
}: {
  channels: Channel[]
  activeSlug: string | null
  tenantName: string
  userInitials: string
  children: ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Slim topbar — chat lives inside the app shell context */}
      <header
        style={{
          height: 'var(--topbar-h)',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 var(--s-4)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)' }}>
          <Link
            href="/"
            style={{
              font: '700 16px/1 var(--font-sans)',
              color: 'var(--navy)',
              letterSpacing: '-0.2px',
              textDecoration: 'none',
            }}
          >
            Kantr
          </Link>
          <span style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
            · {tenantName} · Chat
          </span>
        </div>
        <div
          title="Anda"
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'var(--indigo)',
            color: 'var(--white)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            font: '600 11px/1 var(--font-sans)',
          }}
        >
          {userInitials}
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Channel list */}
        <nav
          style={{
            width: 240,
            borderRight: '1px solid var(--border)',
            background: 'var(--surface)',
            padding: 'var(--s-4)',
            overflowY: 'auto',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--s-3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span className="t-micro">Kanal</span>
            <Link
              href="/chat/new"
              style={{
                font: '600 11px/1 var(--font-sans)',
                color: 'var(--indigo)',
                textDecoration: 'none',
              }}
            >
              + Baru
            </Link>
          </div>
          {channels.length === 0 ? (
            <p style={{ font: '400 12px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: 0 }}>
              Belum ada kanal. Buat yang pertama.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {channels.map((c) => {
                const active = c.slug === activeSlug
                return (
                  <Link
                    key={c.id}
                    href={`/chat/${c.slug}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      height: 30,
                      padding: '0 8px',
                      borderRadius: 'var(--r-sm)',
                      font: '500 13px/1 var(--font-sans)',
                      color: active ? 'var(--indigo)' : 'var(--fg-2)',
                      background: active ? 'var(--indigo-light)' : 'transparent',
                      textDecoration: 'none',
                    }}
                  >
                    <span style={{ color: 'var(--fg-3)', marginRight: 4 }}>#</span>
                    {c.slug}
                  </Link>
                )
              })}
            </div>
          )}
        </nav>

        {/* Main pane */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
