import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listTools } from '../../../lib/agent'
import { SettingsShell } from '../SettingsShell'
import SeedToolsButton from './SeedToolsButton'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function AgentSettingsPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')
  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'

  const tools = await listTools(ctx.tenant.id)

  return (
    <SettingsShell activeSection="agent" isAdmin={isAdmin} tenantName={ctx.tenant.name} userInitials={initials(session.user.name)} userEmail={session.user.email}>
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--s-6) var(--content-gutter)' }}>
        <div style={{ maxWidth: 720, width: '100%' }}>
          <h2 style={{ marginBottom: 'var(--s-2)' }}>Pengaturan Agent</h2>
          <p style={{ color: 'var(--fg-3)', font: '400 13px/1.5 var(--font-sans)', marginBottom: 'var(--s-6)' }}>
            Tool Registry berisi semua kapabilitas yang bisa dipanggil agen. Kelola agen dan mandat di halaman Agent.
          </p>

          <div style={{ marginBottom: 'var(--s-5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--s-3)' }}>
              <div className="t-micro">Tool Registry ({tools.length} tool terdaftar)</div>
              {isAdmin && <SeedToolsButton disabled={false} />}
            </div>
            {tools.length === 0 ? (
              <p style={{ font: '400 13px/1.5 var(--font-sans)', color: 'var(--fg-3)' }}>
                Belum ada tool terdaftar. Tool didaftarkan oleh modul saat diaktifkan.
              </p>
            ) : (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                {tools.map((t) => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', padding: '10px var(--s-4)', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ font: '500 12px/1 var(--font-mono)', color: 'var(--fg-2)' }}>{t.name}</span>
                    <span style={{ font: '500 10px/1 var(--font-sans)', color: 'var(--fg-3)', background: 'var(--bg)', border: '1px solid var(--border)', padding: '2px 5px', borderRadius: 3 }}>{t.module}</span>
                    {t.description && <span style={{ font: '400 12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>{t.description}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link href="/agent" style={{ display: 'inline-flex', alignItems: 'center', height: 34, padding: '0 var(--s-3)', background: 'var(--indigo)', color: 'var(--white)', borderRadius: 'var(--r-sm)', font: '600 12px/1 var(--font-sans)', textDecoration: 'none' }}>
            Kelola Agen →
          </Link>
        </div>
      </div>
    </SettingsShell>
  )
}
