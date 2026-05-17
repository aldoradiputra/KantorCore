import Link from 'next/link'
import type { ReactNode } from 'react'
import type { Project } from '@kantr/db'

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header
        style={{
          height: 'var(--topbar-h)',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 var(--s-4)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)' }}>
          <Link
            href="/"
            style={{
              font: '700 16px/1 var(--font-sans)',
              color: 'var(--navy)',
              letterSpacing: '-0.2px',
              textDecoration: 'none',
            }}
          >
            Kantr
          </Link>
          <span style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
            · {tenantName} · Proyek
          </span>
        </div>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'var(--indigo)',
            color: 'var(--white)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            font: '600 11px/1 var(--font-sans)',
          }}
        >
          {userInitials}
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <nav
          style={{
            width: 240,
            borderRight: '1px solid var(--border)',
            background: 'var(--surface)',
            padding: 'var(--s-4)',
            overflowY: 'auto',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--s-3)',
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
        </nav>

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
