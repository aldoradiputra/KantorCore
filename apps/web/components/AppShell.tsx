import Link from 'next/link'
import type { ReactNode } from 'react'
import React from 'react'
import LiveBadge from './LiveBadge'
import NotificationBell from './NotificationBell'
import KeyboardChrome, { SearchTrigger } from './KeyboardChrome'
import AgentInboxPill from './AgentInboxPill'
import UserAvatar from './UserAvatar'

// ── Icon primitives ───────────────────────────────────────────
function IconHome() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 7.5L9 2l7 5.5V16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.5z" />
      <path d="M7 17v-6h4v6" />
    </svg>
  )
}

/**
 * Design-mark module icons (multi-tone tile, 48×48 from
 * /public/icons/modules/). Rendered at 22×22 in the sidebar per spec.
 * Modules without a design mark fall back to inline currentColor SVGs.
 */
function IconChat() {
  return <img src="/icons/modules/chat.svg" alt="" width={22} height={22} />
}

function IconProj() {
  return <img src="/icons/modules/projects.svg" alt="" width={22} height={22} />
}

function IconAgent() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="14" height="11" rx="2" />
      <path d="M6 5V4a3 3 0 0 1 6 0v1" />
      <circle cx="6.5" cy="10.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="11.5" cy="10.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconHR() {
  return <img src="/icons/modules/hr.svg" alt="" width={22} height={22} />
}

function IconRent() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="12" r="3" />
      <path d="M8 10l5-5 3 3-1.5 1.5L13 8l-2 2" />
    </svg>
  )
}

function IconTime() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="7.5" />
      <path d="M9 5v4l2.5 2.5" />
    </svg>
  )
}

function IconProses() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="4" cy="4" r="2" />
      <circle cx="14" cy="9" r="2" />
      <circle cx="4" cy="14" r="2" />
      <path d="M4 6v6" />
      <path d="M6 4h6" />
      <path d="M12 9H6" />
    </svg>
  )
}

// ── Module list ───────────────────────────────────────────────
type ModuleId = 'home' | 'chat' | 'proj' | 'agent' | 'hr' | 'rent' | 'time' | 'proses'

const MODULES: { id: ModuleId; label: string; href: string; hotkey: string; Icon: () => React.ReactElement }[] = [
  { id: 'home', label: 'Beranda', href: '/', hotkey: 'G H', Icon: IconHome },
  { id: 'chat', label: 'Chat', href: '/chat', hotkey: 'G C', Icon: IconChat },
  { id: 'proj', label: 'Proyek', href: '/proj', hotkey: 'G P', Icon: IconProj },
  { id: 'hr', label: 'SDM', href: '/hr', hotkey: 'G R', Icon: IconHR },
  { id: 'time', label: 'Waktu', href: '/time', hotkey: 'G W', Icon: IconTime },
  { id: 'rent', label: 'Sewa', href: '/rent', hotkey: 'G S', Icon: IconRent },
  { id: 'proses', label: 'Proses', href: '/proses', hotkey: 'G O', Icon: IconProses },
  { id: 'agent', label: 'Agent', href: '/agent', hotkey: 'G A', Icon: IconAgent },
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
            aria-label="KantorCore"
            style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}
          >
            <img
              src="/brand/kantorcore-lockup.svg"
              alt="KantorCore"
              height={20}
              style={{ display: 'block', height: 20, width: 'auto' }}
            />
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

          <AgentInboxPill />

          <NotificationBell />

          <UserAvatar initials={userInitials} email={userEmail} />
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
