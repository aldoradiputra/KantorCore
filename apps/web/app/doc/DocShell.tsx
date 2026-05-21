import Link from 'next/link'
import type { ReactNode } from 'react'
import { AppShell } from '../../components/AppShell'

type DocSection = 'documents'

function DocSidebar({ activeSection }: { activeSection: DocSection | null }) {
  const items: { section: DocSection; label: string; href: string }[] = [
    { section: 'documents', label: 'Dokumen & Kontrak', href: '/doc/documents' },
  ]
  return (
    <div style={{ padding: 'var(--s-4)', display: 'flex', flexDirection: 'column', gap: 'var(--s-4)', height: '100%', overflowY: 'auto' }}>
      <div>
        <div className="t-micro" style={{ marginBottom: 'var(--s-2)' }}>Dokumen</div>
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

export function DocShell({
  tenantName,
  userInitials,
  activeSection,
  children,
}: {
  tenantName: string
  userInitials: string
  activeSection: DocSection | null
  children: ReactNode
}) {
  return (
    <AppShell
      tenantName={tenantName}
      userInitials={userInitials}
      activeModule="doc"
      sidebar={<DocSidebar activeSection={activeSection} />}
    >
      {children}
    </AppShell>
  )
}
