import Link from 'next/link'
import type { ReactNode } from 'react'
import type { Channel } from '@kantorcore/db'
import { AppShell } from '../../components/AppShell'

function ChatSidebar({
  channels,
  activeSlug,
}: {
  channels: Channel[]
  activeSlug: string | null
}) {
  return (
    <div
      style={{
        padding: 'var(--s-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--s-3)',
        height: '100%',
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
      <div style={{ flex: 1 }} />
      <Link href="/settings/chat" style={{ display: 'flex', alignItems: 'center', height: 28, padding: '0 8px', borderRadius: 'var(--r-sm)', font: '500 11px/1 var(--font-sans)', color: 'var(--fg-3)', textDecoration: 'none' }}>
        ⚙ Pengaturan Chat
      </Link>
    </div>
  )
}

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
    <AppShell
      tenantName={tenantName}
      userInitials={userInitials}
      activeModule="chat"
      sidebar={<ChatSidebar channels={channels} activeSlug={activeSlug} />}
    >
      {children}
    </AppShell>
  )
}
