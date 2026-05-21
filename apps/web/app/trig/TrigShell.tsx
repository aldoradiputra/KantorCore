import Link from 'next/link'
import type { ReactNode } from 'react'
import { AppShell } from '../../components/AppShell'

type TrigSection = 'rules'

function TrigSidebar({ activeSection }: { activeSection: TrigSection | null }) {
  return (
    <div style={{ padding: 'var(--s-4)', display: 'flex', flexDirection: 'column', gap: 'var(--s-4)', height: '100%', overflowY: 'auto' }}>
      <div>
        <div className="t-micro" style={{ marginBottom: 'var(--s-2)' }}>Otomasi</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[{ section: 'rules' as TrigSection, label: 'Event Triggers', href: '/trig/rules' }].map(({ section, label, href }) => {
            const active = section === activeSection
            return (
              <Link key={section} href={href} style={{
                display: 'flex', alignItems: 'center', height: 32, padding: '0 8px',
                borderRadius: 'var(--r-sm)', font: '500 13px/1 var(--font-sans)',
                color: active ? 'var(--indigo)' : 'var(--fg-2)',
                background: active ? 'var(--indigo-light)' : 'transparent', textDecoration: 'none',
              }}>{label}</Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function TrigShell({ tenantName, userInitials, activeSection, children }: {
  tenantName: string; userInitials: string; activeSection: TrigSection | null; children: ReactNode
}) {
  return (
    <AppShell tenantName={tenantName} userInitials={userInitials} activeModule="trig" sidebar={<TrigSidebar activeSection={activeSection} />}>
      {children}
    </AppShell>
  )
}
