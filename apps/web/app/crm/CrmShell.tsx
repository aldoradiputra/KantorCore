import Link from 'next/link'
import type { ReactNode } from 'react'
import { AppShell } from '../../components/AppShell'

type CrmSection = 'deals'

function CrmSidebar({ activeSection }: { activeSection: CrmSection | null }) {
  const items: { section: CrmSection; label: string; href: string }[] = [
    { section: 'deals', label: 'Pipeline', href: '/crm/deals' },
  ]
  return (
    <div style={{ padding: 'var(--s-4)', display: 'flex', flexDirection: 'column', gap: 'var(--s-4)', height: '100%', overflowY: 'auto' }}>
      <div>
        <div className="t-micro" style={{ marginBottom: 'var(--s-2)' }}>CRM</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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
    </div>
  )
}

export function CrmShell({
  tenantName,
  userInitials,
  activeSection,
  children,
}: {
  tenantName: string
  userInitials: string
  activeSection: CrmSection | null
  children: ReactNode
}) {
  return (
    <AppShell
      tenantName={tenantName}
      userInitials={userInitials}
      activeModule="crm"
      sidebar={<CrmSidebar activeSection={activeSection} />}
    >
      {children}
    </AppShell>
  )
}
