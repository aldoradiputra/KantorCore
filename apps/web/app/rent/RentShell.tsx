import Link from 'next/link'
import type { ReactNode } from 'react'
import { AppShell } from '../../components/AppShell'

type RentSection = 'assets' | 'reservations' | 'customers'

function RentSidebar({ activeSection }: { activeSection: RentSection | null }) {
  const nav: { section: RentSection; label: string; href: string }[] = [
    { section: 'assets', label: 'Aset', href: '/rent/assets' },
    { section: 'reservations', label: 'Reservasi', href: '/rent/reservations' },
    { section: 'customers', label: 'Pelanggan', href: '/rent/customers' },
  ]
  return (
    <div style={{ padding: 'var(--s-4)', display: 'flex', flexDirection: 'column', gap: 'var(--s-3)', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="t-micro">Sewa</span>
        <Link
          href="/rent/reservations/new"
          style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--indigo)', textDecoration: 'none' }}
        >
          + Reservasi
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

export function RentShell({
  tenantName,
  userInitials,
  activeSection,
  children,
}: {
  tenantName: string
  userInitials: string
  activeSection: RentSection | null
  children: ReactNode
}) {
  return (
    <AppShell
      tenantName={tenantName}
      userInitials={userInitials}
      activeModule="rent"
      sidebar={<RentSidebar activeSection={activeSection} />}
    >
      {children}
    </AppShell>
  )
}
