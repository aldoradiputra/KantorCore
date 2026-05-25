import Link from 'next/link'
import type { ReactNode } from 'react'
import { AppShell } from '../../components/AppShell'

type GameSection = 'overview' | 'challenges' | 'badges' | 'history'

function GameSidebar({ activeSection }: { activeSection: GameSection | null }) {
  const nav: { section: GameSection; label: string; href: string }[] = [
    { section: 'overview',    label: 'Papan Skor',  href: '/gamification' },
    { section: 'challenges',  label: 'Tantangan',   href: '/gamification/challenges' },
    { section: 'badges',      label: 'Lencana',     href: '/gamification/badges' },
    { section: 'history',     label: 'Riwayat Tujuan', href: '/gamification/history' },
  ]
  return (
    <div style={{ padding: 'var(--s-4)', display: 'flex', flexDirection: 'column', gap: 'var(--s-3)', height: '100%' }}>
      <span className="t-micro">GAMIFIKASI</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {nav.map(({ section, label, href }) => {
          const active = section === activeSection
          return (
            <Link key={section} href={href} style={{
              display: 'flex', alignItems: 'center', height: 32, padding: '0 8px',
              borderRadius: 'var(--r-sm)', font: '500 13px/1 var(--font-sans)',
              color: active ? 'var(--indigo)' : 'var(--fg-2)',
              background: active ? 'var(--indigo-light)' : 'transparent',
              textDecoration: 'none',
            }}>
              {label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function GamificationShell({
  tenantName, userInitials, activeSection, children,
}: {
  tenantName:    string
  userInitials:  string
  activeSection: GameSection | null
  children:      ReactNode
}) {
  return (
    <AppShell
      tenantName={tenantName}
      userInitials={userInitials}
      activeModule="gamification"
      sidebar={<GameSidebar activeSection={activeSection} />}
    >
      {children}
    </AppShell>
  )
}
