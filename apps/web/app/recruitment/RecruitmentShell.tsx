import Link from 'next/link'
import type { ReactNode } from 'react'
import { AppShell } from '../../components/AppShell'

type RecruitSection = 'overview' | 'jobs' | 'applications' | 'assessments'

function RecruitSidebar({ activeSection }: { activeSection: RecruitSection | null }) {
  const groups = [
    {
      label: 'Rekrutmen',
      items: [
        { section: 'overview' as const,      label: 'Ringkasan',   href: '/recruitment' },
        { section: 'jobs' as const,          label: 'Posisi Kerja', href: '/recruitment/jobs' },
        { section: 'applications' as const,  label: 'Lamaran',     href: '/recruitment/applications' },
      ],
    },
    {
      label: 'Asesmen',
      items: [
        { section: 'assessments' as const, label: 'Bank Soal', href: '/recruitment/assessments' },
      ],
    },
  ]

  return (
    <div style={{ padding: 'var(--s-4)', display: 'flex', flexDirection: 'column', gap: 'var(--s-4)', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="t-micro">REKRUTMEN</span>
        <Link href="/recruitment/jobs/new" style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--indigo)', textDecoration: 'none' }}>
          + Posisi
        </Link>
      </div>
      {groups.map((g) => (
        <div key={g.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ font: '500 10px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 8px', marginBottom: 2 }}>
            {g.label}
          </div>
          {g.items.map(({ section, label, href }) => {
            const active = section === activeSection
            return (
              <Link key={section} href={href} style={{
                display: 'flex', alignItems: 'center', height: 32, padding: '0 8px',
                borderRadius: 'var(--r-sm)', font: '500 13px/1 var(--font-sans)',
                color: active ? 'var(--indigo)' : 'var(--fg-2)',
                background: active ? 'var(--indigo-light)' : 'transparent',
                textDecoration: 'none',
              }}>
                {label}
              </Link>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export function RecruitmentShell({
  tenantName, userInitials, activeSection, children,
}: {
  tenantName:    string
  userInitials:  string
  activeSection: RecruitSection | null
  children:      ReactNode
}) {
  return (
    <AppShell
      tenantName={tenantName}
      userInitials={userInitials}
      activeModule="recruitment"
      sidebar={<RecruitSidebar activeSection={activeSection} />}
    >
      {children}
    </AppShell>
  )
}
