import Link from 'next/link'
import type { ReactNode } from 'react'
import { AppShell } from '../../components/AppShell'

export type SalesSection = 'dashboard' | 'orders' | 'quotations' | 'settings'

function SalesSidebar({ activeSection }: { activeSection: SalesSection | null }) {
  const groups: { label: string; items: { section: SalesSection; label: string; href: string }[] }[] = [
    {
      label: 'Ringkasan',
      items: [
        { section: 'dashboard',  label: 'Dashboard', href: '/sales' },
      ],
    },
    {
      label: 'Dokumen',
      items: [
        { section: 'quotations', label: 'Penawaran',   href: '/sales/orders?status=quotation' },
        { section: 'orders',     label: 'Sales Order', href: '/sales/orders' },
      ],
    },
    {
      label: 'Konfigurasi',
      items: [
        { section: 'settings',   label: 'Pengaturan', href: '/sales/settings' },
      ],
    },
  ]

  return (
    <div style={{ padding: 'var(--s-4)', display: 'flex', flexDirection: 'column', gap: 'var(--s-5)', height: '100%', overflowY: 'auto' }}>
      {groups.map((group) => (
        <div key={group.label}>
          <div
            className="t-micro"
            style={{ marginBottom: 'var(--s-2)', paddingLeft: 8, color: 'var(--fg-3)', letterSpacing: '.04em', textTransform: 'uppercase', fontSize: 11 }}
          >
            {group.label}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {group.items.map(({ section, label, href }) => {
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

export function SalesShell({
  tenantName,
  userInitials,
  userEmail,
  activeSection,
  children,
}: {
  tenantName: string
  userInitials: string
  userEmail?: string
  activeSection: SalesSection | null
  children: ReactNode
}) {
  return (
    <AppShell
      tenantName={tenantName}
      userInitials={userInitials}
      userEmail={userEmail}
      activeModule="sales"
      sidebar={<SalesSidebar activeSection={activeSection} />}
    >
      {children}
    </AppShell>
  )
}
