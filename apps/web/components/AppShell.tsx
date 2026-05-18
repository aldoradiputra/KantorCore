import Link from 'next/link'
import type { ReactNode } from 'react'
import React from 'react'
import LiveBadge from './LiveBadge'
import NotificationBell from './NotificationBell'
import KeyboardChrome, { SearchTrigger } from './KeyboardChrome'

// ── Icon primitives ───────────────────────────────────────────
function IconHome() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 7.5L9 2l7 5.5V16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.5z" />
      <path d="M7 17v-6h4v6" />
    </svg>
  )
}

function IconChat() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 2H2a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3l4 3 4-3h3a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" />
    </svg>
  )
}

function IconProj() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="5" height="16" rx="1" />
      <rect x="8" y="1" width="5" height="11" rx="1" />
      <rect x="15" y="1" width="2" height="7" rx="1" />
    </svg>
  )
}

// ── Module list ───────────────────────────────────────────────
type ModuleId = 'home' | 'chat' | 'proj'

const MODULES: { id: ModuleId; label: string; href: string; hotkey: string; Icon: () => React.ReactElement }[] = [
  { id: 'home', label: 'Beranda', href: '/', hotkey: 'G H', Icon: IconHome },
  { id: 'chat', label: 'Chat', href: '/chat', hotkey: 'G C', Icon: IconChat },
  { id: 'proj', label: 'Proyek', href: '/proj', hotkey: 'G P', Icon: IconProj },
]

// ── Shell ─────────────────────────────────────────────────────
export function AppShell({
  tenantName,
  userInitials,
  userEmail,
  activeModule,
  sidebar,
  children,
}: {
  tenantName: string
  userInitials: string
  userEmail?: string
  activeModule: ModuleId | null
  sidebar?: ReactNode
  children: ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <KeyboardChrome />
      {/* ── Top bar ── */}
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
          gap: 'var(--s-3)',
        }}
      >
        {/* Left: wordmark + workspace */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', minWidth: 0 }}>
          <Link
            href="/"
            style={{
              font: '800 15px/1 var(--font-sans)',
              color: 'var(--navy)',
              letterSpacing: '-0.3px',
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            Kantr
          </Link>
          <span
            style={{
              font: '500 12px/1 var(--font-sans)',
              color: 'var(--fg-3)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {tenantName}
          </span>
        </div>

        {/* Right: search · live · bell · avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-2)', flexShrink: 0 }}>
          <SearchTrigger />

          <LiveBadge />

          <NotificationBell />

          {/* User avatar */}
          <div
            title={userEmail}
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
              flexShrink: 0,
              cursor: 'default',
            }}
          >
            {userInitials}
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Icon rail */}
        <nav
          style={{
            width: 'var(--sidebar-w-min)',
            borderRight: '1px solid var(--border)',
            background: 'var(--surface)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingTop: 'var(--s-3)',
            gap: 2,
            flexShrink: 0,
          }}
        >
          {MODULES.map(({ id, label, href, hotkey, Icon }) => {
            const active = activeModule === id
            return (
              <Link
                key={id}
                href={href}
                title={`${label} (${hotkey})`}
                style={{
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'var(--r-md)',
                  color: active ? 'var(--indigo)' : 'var(--fg-3)',
                  background: active ? 'var(--indigo-light)' : 'transparent',
                  textDecoration: 'none',
                  transition: `background var(--d-fast) var(--ease), color var(--d-fast) var(--ease)`,
                }}
              >
                <Icon />
              </Link>
            )
          })}
        </nav>

        {/* Module sidebar (optional) */}
        {sidebar != null && (
          <aside
            style={{
              width: 'var(--sidebar-w)',
              borderRight: '1px solid var(--border)',
              background: 'var(--surface)',
              overflowY: 'auto',
              flexShrink: 0,
            }}
          >
            {sidebar}
          </aside>
        )}

        {/* Content */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  )
}
