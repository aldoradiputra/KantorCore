import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { SettingsShell } from '../SettingsShell'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function ApiKeysPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')
  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) redirect('/settings/profile')

  return (
    <SettingsShell activeSection="api-keys" isAdmin={isAdmin} tenantName={ctx.tenant.name} userInitials={initials(session.user.name)} userEmail={session.user.email}>
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--s-6) var(--content-gutter)' }}>
        <div style={{ maxWidth: 600 }}>
          <h2 style={{ margin: '0 0 var(--s-2)' }}>API Keys</h2>
          <p style={{ font: '400 13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '0 0 var(--s-5)' }}>
            Buat dan kelola API key bertipe per-tenant untuk integrasi eksternal (webhook, ERP bridge, HRIS import).
            Key akan bersifat <code style={{ font: '500 12px/1 var(--font-mono)', background: 'var(--bg)', padding: '1px 5px', borderRadius: 3 }}>Bearer sk_live_…</code> dengan scope yang bisa dikonfigurasi.
          </p>
          <div style={{ padding: 'var(--s-4)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', marginBottom: 'var(--s-4)' }}>
            <div style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--fg-1)', marginBottom: 8 }}>Yang akan tersedia</div>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                'Buat key dengan nama + expiry opsional',
                'Scope: read-only, read-write, atau per-modul',
                'Key hanya ditampilkan sekali saat dibuat (seperti GitHub PAT)',
                'Riwayat penggunaan terakhir (last_used_at + IP)',
                'Revoke individual tanpa mempengaruhi key lain',
              ].map((f) => (
                <li key={f} style={{ font: '400 12px/1.4 var(--font-sans)', color: 'var(--fg-2)' }}>{f}</li>
              ))}
            </ul>
          </div>
          <div style={{ display: 'inline-flex', font: '600 10px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--fg-3)', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: 4 }}>
            Segera hadir — IS-PLAT Phase 2
          </div>
        </div>
      </div>
    </SettingsShell>
  )
}
