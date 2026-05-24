import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../lib/auth'
import { getCurrentTenant } from '../../lib/tenants'
import { listApprovals } from '../../lib/platform/approvals'
import { AppShell } from '../../components/AppShell'
import { ApprovalsInbox } from '../../components/platform/ApprovalsInbox'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function ApprovalsPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const approvals = await listApprovals(ctx.tenant.id, 'pending')

  return (
    <AppShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeModule={null}
    >
      <div style={{ padding: 'var(--s-6) var(--content-gutter)' }}>
        <div style={{ maxWidth: 880, width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
          <header>
            <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>
              Persetujuan
            </h1>
            <p style={{ font: '13px/1.55 var(--font-sans)', color: 'var(--fg-3)', marginTop: 8 }}>
              Daftar permintaan persetujuan yang menunggu keputusan. Persetujuan dibuat otomatis
              oleh langkah proses yang membutuhkan peran tertentu.
            </p>
          </header>
          <ApprovalsInbox initial={approvals} />
        </div>
      </div>
    </AppShell>
  )
}
