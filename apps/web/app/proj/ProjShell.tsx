import Link from 'next/link'
import type { ReactNode } from 'react'
import type { Project } from '@kantr/db'
import { AppShell } from '../../components/AppShell'

function ProjSidebar({
  projects,
  activeSlug,
}: {
  projects: Project[]
  activeSlug: string | null
}) {
  return (
    <div
      style={{
        padding: 'var(--s-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--s-3)',
        height: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="t-micro">Proyek</span>
        <Link
          href="/proj/new"
          style={{
            font: '600 11px/1 var(--font-sans)',
            color: 'var(--indigo)',
            textDecoration: 'none',
          }}
        >
          + Baru
        </Link>
      </div>
      {projects.length === 0 ? (
        <p style={{ font: '400 12px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: 0 }}>
          Belum ada proyek.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {projects.map((p) => {
            const active = p.slug === activeSlug
            return (
              <Link
                key={p.id}
                href={`/proj/${p.slug}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 30,
                  padding: '0 8px',
                  borderRadius: 'var(--r-sm)',
                  font: '500 13px/1 var(--font-sans)',
                  color: active ? 'var(--indigo)' : 'var(--fg-2)',
                  background: active ? 'var(--indigo-light)' : 'transparent',
                  textDecoration: 'none',
                }}
              >
                <span
                  style={{
                    font: '600 10px/1 var(--font-mono)',
                    color: 'var(--fg-3)',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    padding: '2px 4px',
                    borderRadius: 3,
                  }}
                >
                  {p.key}
                </span>
                <span>{p.name}</span>
              </Link>
            )
          })}
        </div>
      )}
      <div style={{ flex: 1 }} />
      <Link href="/settings/proj" style={{ display: 'flex', alignItems: 'center', height: 28, padding: '0 8px', borderRadius: 'var(--r-sm)', font: '500 11px/1 var(--font-sans)', color: 'var(--fg-3)', textDecoration: 'none' }}>
        ⚙ Pengaturan Proyek
      </Link>
    </div>
  )
}

export function ProjShell({
  projects,
  activeSlug,
  tenantName,
  userInitials,
  children,
}: {
  projects: Project[]
  activeSlug: string | null
  tenantName: string
  userInitials: string
  children: ReactNode
}) {
  return (
    <AppShell
      tenantName={tenantName}
      userInitials={userInitials}
      activeModule="proj"
      sidebar={<ProjSidebar projects={projects} activeSlug={activeSlug} />}
    >
      {children}
    </AppShell>
  )
}
