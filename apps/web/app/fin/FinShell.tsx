import Link from 'next/link'
import type { ReactNode } from 'react'
import { AppShell } from '../../components/AppShell'

type FinSection = 'invoices' | 'bills' | 'journal' | 'coa'

function FinSidebar({ activeSection }: { activeSection: FinSection | null }) {
  const nav: { section: FinSection; label: string; href: string }[] = [
    { section: 'invoices', label: 'Faktur Pelanggan', href: '/fin/invoices' },
    { section: 'bills', label: 'Tagihan Vendor', href: '/fin/bills' },
    { section: 'journal', label: 'Jurnal', href: '/fin/journal' },
    { section: 'coa', label: 'Bagan Akun', href: '/fin/coa' },
  ]
  return (
    <div style={{ padding: 'var(--s-4)', display: 'flex', flexDirection: 'column', gap: 'var(--s-3)', height: '100%' }}>
      <span className="t-micro">KEUANGAN</span>
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

export function FinShell({
  tenantName,
  userInitials,
  activeSection,
  children,
}: {
  tenantName: string
  userInitials: string
  activeSection: FinSection | null
  children: ReactNode
}) {
  return (
    <AppShell
      tenantName={tenantName}
      userInitials={userInitials}
      activeModule="fin"
      sidebar={<FinSidebar activeSection={activeSection} />}
    >
      {children}
    </AppShell>
  )
}
