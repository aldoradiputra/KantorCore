import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { SettingsShell } from '../SettingsShell'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function ProjSettingsPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')
  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'

  return (
    <SettingsShell activeSection="proj" isAdmin={isAdmin} tenantName={ctx.tenant.name} userInitials={initials(session.user.name)} userEmail={session.user.email}>
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--s-6) var(--content-gutter)' }}>
        <div style={{ maxWidth: 560 }}>
          <h2 style={{ marginBottom: 'var(--s-2)' }}>Pengaturan Proyek</h2>
          <p style={{ color: 'var(--fg-3)', font: '400 13px/1.5 var(--font-sans)', marginBottom: 'var(--s-5)' }}>
            Status default, label prioritas, dan workflow kustom tersedia di sini saat IS-PROJ Phase 2 shipped.
          </p>
          <div style={{ display: 'inline-flex', font: '600 10px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--fg-3)', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: 4 }}>
            Segera hadir
          </div>
        </div>
      </div>
    </SettingsShell>
  )
}
