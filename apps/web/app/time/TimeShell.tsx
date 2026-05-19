import Link from 'next/link'
import type { ReactNode } from 'react'
import { AppShell } from '../../components/AppShell'

type TimeSection = 'entries' | 'weekly'

function TimeSidebar({ activeSection }: { activeSection: TimeSection | null }) {
  const nav: { section: TimeSection; label: string; href: string }[] = [
    { section: 'entries', label: 'Entri Waktu', href: '/time/entries' },
    { section: 'weekly', label: 'Ringkasan Mingguan', href: '/time/weekly' },
  ]
  return (
    <div style={{ padding: 'var(--s-4)', display: 'flex', flexDirection: 'column', gap: 'var(--s-3)', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="t-micro">WAKTU</span>
        <Link
          href="/time/entries/new"
          style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--indigo)', textDecoration: 'none' }}
        >
          + Entri
        </Link>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {nav.map(({ section, label, href }) => {
          const active = section === activeSection
          return (
            <Link
              key={section}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                height: 32,
                padding: '0 8px',
                borderRadius: 'var(--r-sm)',
                font: '500 13px/1 var(--font-sans)',
                color: active ? 'var(--indigo)' : 'var(--fg-2)',
                background: active ? 'var(--indigo-light)' : 'transparent',
                textDecoration: 'none',
              }}
            >
              {label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function TimeShell({
  tenantName,
  userInitials,
  activeSection,
  children,
}: {
  tenantName: string
  userInitials: string
  activeSection: TimeSection | null
  children: ReactNode
}) {
  return (
    <AppShell
      tenantName={tenantName}
      userInitials={userInitials}
      activeModule="time"
      sidebar={<TimeSidebar activeSection={activeSection} />}
    >
      {children}
    </AppShell>
  )
}
