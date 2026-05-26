import Link from 'next/link'
import type { ReactNode } from 'react'
import { AppShell } from '../../components/AppShell'

type FinSection = 'invoices' | 'bills' | 'journal' | 'coa' | 'taxes' | 'journals-setup' | 'reconciliation' | 'reports' | 'setup'

function FinSidebar({ activeSection }: { activeSection: FinSection | null }) {
  const groups: { heading: string; items: { section: FinSection; label: string; href: string }[] }[] = [
    {
      heading: 'KEUANGAN',
      items: [
        { section: 'invoices', label: 'Faktur Pelanggan', href: '/fin/invoices' },
        { section: 'bills', label: 'Tagihan Vendor', href: '/fin/bills' },
        { section: 'journal', label: 'Jurnal', href: '/fin/journal' },
        { section: 'coa', label: 'Bagan Akun', href: '/fin/coa' },
        { section: 'taxes', label: 'Pajak', href: '/fin/taxes' },
      ],
    },
    {
      heading: 'AKUNTANSI',
      items: [
        { section: 'journals-setup', label: 'Jurnal Setup', href: '/fin/journals-setup' },
        { section: 'reconciliation', label: 'Rekonsiliasi', href: '/fin/reconciliation' },
        { section: 'reports', label: 'Laporan', href: '/fin/reports' },
        { section: 'setup', label: 'Onboarding Setup', href: '/fin/setup' },
      ],
    },
  ]
  return (
    <div style={{ padding: 'var(--s-4)', display: 'flex', flexDirection: 'column', gap: 'var(--s-3)', height: '100%' }}>
      {groups.map(({ heading, items }) => (
        <div key={heading} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
          <span className="t-micro">{heading}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {items.map(({ section, label, href }) => {
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
      ))}
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
