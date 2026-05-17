import { redirect } from 'next/navigation'
import { Button } from '@kantr/ui'
import { getCurrentSession } from '../lib/auth'
import { getCurrentTenant } from '../lib/tenants'
import SignOutButton from './SignOutButton'

type SidebarSection = {
  label: string
  items: { label: string; href?: string; soon?: boolean; active?: boolean }[]
}

const SIDEBAR: SidebarSection[] = [
  {
    label: 'Operasi',
    items: [
      { label: 'Beranda', href: '/', active: true },
      { label: 'HR & Karyawan', soon: true },
      { label: 'Keuangan', soon: true },
      { label: 'Penjualan', soon: true },
      { label: 'Pengadaan', soon: true },
      { label: 'Inventori', soon: true },
    ],
  },
  {
    label: 'Kolaborasi',
    items: [
      { label: 'Chat', href: '/chat' },
      { label: 'Proyek', soon: true },
      { label: 'Email', soon: true },
      { label: 'Telepon', soon: true },
    ],
  },
  {
    label: 'Platform',
    items: [
      { label: 'Otomasi', soon: true },
      { label: 'Agent', soon: true },
      { label: 'Pengaturan', soon: true },
    ],
  },
]

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

export default async function Home() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const { user } = session
  const ctx = await getCurrentTenant(user.id)
  // Legacy users created before tenant provisioning shipped will land here
  // with no workspace; routing them to /sign-up to provision one is cleaner
  // than building a recovery UI for what should be an empty set.
  if (!ctx) redirect('/sign-up')
  const { tenant, membership } = ctx

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Topbar */}
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
          <span
            style={{
              font: '700 16px/1 var(--font-sans)',
              color: 'var(--navy)',
              letterSpacing: '-0.2px',
            }}
          >
            Kantr
          </span>
          <span style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
            · {tenant.name}
          </span>
          <span
            style={{
              font: '600 9px/1 var(--font-sans)',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              color: 'var(--fg-3)',
              border: '1px solid var(--border)',
              padding: '3px 5px',
              borderRadius: 4,
            }}
          >
            {membership.role}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 10px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              background: 'var(--bg)',
              font: '500 12px/1 var(--font-sans)',
              color: 'var(--fg-3)',
            }}
          >
            <span>Cari</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                padding: '2px 5px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 4,
              }}
            >
              ⌘K
            </span>
          </div>
          <div
            title={user.email}
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
            {initials(user.name)}
          </div>
          <SignOutButton />
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        <nav
          style={{
            width: 'var(--sidebar-w)',
            borderRight: '1px solid var(--border)',
            background: 'var(--surface)',
            padding: 'var(--s-4)',
            overflowY: 'auto',
            flexShrink: 0,
          }}
        >
          {SIDEBAR.map((section) => (
            <div key={section.label} style={{ marginBottom: 'var(--s-5)' }}>
              <div className="t-micro" style={{ marginBottom: 'var(--s-3)' }}>
                {section.label}
              </div>
              {section.items.map((item) => {
                const rowStyle: React.CSSProperties = {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  height: 32,
                  padding: '0 8px',
                  borderRadius: 'var(--r-sm)',
                  font: '500 13px/1 var(--font-sans)',
                  color: item.active ? 'var(--indigo)' : item.soon ? 'var(--fg-3)' : 'var(--fg-2)',
                  background: item.active ? 'var(--indigo-light)' : 'transparent',
                  cursor: item.soon ? 'not-allowed' : 'pointer',
                  textDecoration: 'none',
                }
                const inner = (
                  <>
                    <span>{item.label}</span>
                    {item.soon && (
                      <span
                        style={{
                          font: '700 9px/1 var(--font-sans)',
                          letterSpacing: '0.8px',
                          textTransform: 'uppercase',
                          color: 'var(--fg-3)',
                          background: 'var(--bg)',
                          border: '1px solid var(--border)',
                          padding: '3px 5px',
                          borderRadius: 4,
                        }}
                      >
                        Soon
                      </span>
                    )}
                  </>
                )
                return item.href && !item.soon ? (
                  <a key={item.label} href={item.href} style={rowStyle}>
                    {inner}
                  </a>
                ) : (
                  <div key={item.label} style={rowStyle}>
                    {inner}
                  </div>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Content — pre-alpha placeholder */}
        <main
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 'var(--s-7) var(--content-gutter)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 560,
              padding: 'var(--s-7)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)',
              background: 'var(--surface)',
              textAlign: 'center',
            }}
          >
            <span className="t-micro" style={{ display: 'block', marginBottom: 'var(--s-4)' }}>
              Pre-alpha · v0.0.1
            </span>
            <h2 style={{ marginBottom: 'var(--s-3)' }}>Halo, {user.name.split(' ')[0]}.</h2>
            <p style={{ marginBottom: 'var(--s-5)', color: 'var(--fg-3)' }}>
              Anda sudah masuk. Cangkang aplikasi siap; modul pertama (Chat, lalu
              Proyek) sedang dipasang. Lihat roadmap untuk progres.
            </p>
            <div style={{ display: 'flex', gap: 'var(--s-3)', justifyContent: 'center' }}>
              <a href="https://roadmap.kantr.com">
                <Button variant="primary" size="md">
                  Lihat Roadmap
                </Button>
              </a>
              <a href="https://kantr.com">
                <Button variant="secondary" size="md">
                  Beranda
                </Button>
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
