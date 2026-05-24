import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { listCustomRoles } from '../../../../lib/platform/policy'
import { AppShell } from '../../../../components/AppShell'
import { RolesPanel } from './RolesPanel'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function RolesPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const roles = await listCustomRoles(ctx.tenant.id)

  return (
    <AppShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeModule={null}
    >
      <div style={{ padding: 'var(--s-6) var(--content-gutter)' }}>
        <div style={{ maxWidth: 880, width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
          <div style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
            <Link href="/settings" style={{ color: 'var(--fg-3)', textDecoration: 'none' }}>Settings</Link>
            <span style={{ margin: '0 6px' }}>›</span>
            Platform · Custom Roles
          </div>
          <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>
            Custom Roles
          </h1>
          <p style={{ font: '13px/1.55 var(--font-sans)', color: 'var(--fg-3)', margin: 0, maxWidth: 720 }}>
            Peran khusus tenant di luar owner/admin/member. Dipakai oleh policies untuk pencocokan
            principal, dan oleh langkah proses untuk persyaratan persetujuan.
          </p>
          <RolesPanel initial={roles} />
        </div>
      </div>
    </AppShell>
  )
}
