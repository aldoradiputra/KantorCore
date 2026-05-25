import Link from 'next/link'
import type { ReactNode } from 'react'
import { AppShell } from '../../components/AppShell'

type CrmSection = 'pipeline' | 'leads' | 'teams' | 'forecast' | 'reports'

function CrmSidebar({ activeSection }: { activeSection: CrmSection | null }) {
  const groups: { label: string; items: { section: CrmSection; label: string; href: string }[] }[] = [
    {
      label: 'Penjualan',
      items: [
        { section: 'pipeline', label: 'Pipeline',  href: '/crm/deals' },
        { section: 'leads',    label: 'Lead',       href: '/crm/leads' },
      ],
    },
    {
      label: 'Tim',
      items: [
        { section: 'teams',    label: 'Tim Sales',  href: '/crm/teams' },
        { section: 'forecast', label: 'Forecast',   href: '/crm/forecast' },
      ],
    },
    {
      label: 'Laporan',
      items: [
        { section: 'reports',  label: 'Kinerja',    href: '/crm/reports' },
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

export function CrmShell({
  tenantName,
  userInitials,
  userEmail,
  activeSection,
  children,
}: {
  tenantName: string
  userInitials: string
  userEmail?: string
  activeSection: CrmSection | null
  children: ReactNode
}) {
  return (
    <AppShell
      tenantName={tenantName}
      userInitials={userInitials}
      userEmail={userEmail}
      activeModule="crm"
      sidebar={<CrmSidebar activeSection={activeSection} />}
    >
      {children}
    </AppShell>
  )
}
