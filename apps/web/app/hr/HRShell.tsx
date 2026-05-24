import Link from 'next/link'
import type { ReactNode } from 'react'
import { AppShell } from '../../components/AppShell'

type HRSection = 'employees' | 'departments' | 'time-off'

function HRSidebar({ activeSection }: { activeSection: HRSection | null }) {
  const nav: { section: HRSection; label: string; href: string }[] = [
    { section: 'employees',   label: 'Karyawan',   href: '/hr/employees' },
    { section: 'departments', label: 'Departemen', href: '/hr/departments' },
    { section: 'time-off',    label: 'Cuti & Izin', href: '/hr/time-off' },
  ]
  return (
    <div style={{ padding: 'var(--s-4)', display: 'flex', flexDirection: 'column', gap: 'var(--s-3)', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="t-micro">SDM</span>
        <Link
          href="/hr/employees/new"
          style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--indigo)', textDecoration: 'none' }}
        >
          + Karyawan
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

export function HRShell({
  tenantName,
  userInitials,
  userEmail,
  activeSection,
  children,
}: {
  tenantName: string
  userInitials: string
  userEmail?: string
  activeSection: HRSection | null
  children: ReactNode
}) {
  return (
    <AppShell
      tenantName={tenantName}
      userInitials={userInitials}
      userEmail={userEmail}
      activeModule="hr"
      sidebar={<HRSidebar activeSection={activeSection} />}
    >
      {children}
    </AppShell>
  )
}
