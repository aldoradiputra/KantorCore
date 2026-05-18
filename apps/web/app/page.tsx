import { redirect } from 'next/navigation'
import { Button } from '@kantr/ui'
import { getCurrentSession } from '../lib/auth'
import { getCurrentTenant } from '../lib/tenants'
import { AppShell } from '../components/AppShell'
import SignOutButton from './SignOutButton'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

function HomeSidebar({
  tenantName,
  membershipRole,
}: {
  tenantName: string
  membershipRole: string
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
      <div>
        <span className="t-micro">Ruang kerja</span>
        <div style={{ marginTop: 'var(--s-2)' }}>
          <div style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>
            {tenantName}
          </div>
          <div
            style={{
              marginTop: 4,
              display: 'inline-flex',
              font: '600 9px/1 var(--font-sans)',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              color: 'var(--fg-3)',
              border: '1px solid var(--border)',
              padding: '3px 5px',
              borderRadius: 4,
            }}
          >
            {membershipRole}
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <SignOutButton />
    </div>
  )
}

export default async function Home() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const { user } = session
  const ctx = await getCurrentTenant(user.id)
  // Legacy users without a provisioned workspace go to /sign-up to create one.
  if (!ctx) redirect('/sign-up')
  const { tenant, membership } = ctx

  return (
    <AppShell
      tenantName={tenant.name}
      userInitials={initials(user.name)}
      userEmail={user.email}
      activeModule="home"
      sidebar={<HomeSidebar tenantName={tenant.name} membershipRole={membership.role} />}
    >
      <div
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
      </div>
    </AppShell>
  )
}
