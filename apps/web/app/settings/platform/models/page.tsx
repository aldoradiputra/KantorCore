import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { listModels } from '../../../../lib/platform/registry'
import { SettingsShell } from '../../SettingsShell'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function PlatformModelsPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')
  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) redirect('/settings/profile')

  const models = await listModels()

  return (
    <SettingsShell
      activeSection="platform-models"
      isAdmin={isAdmin}
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      userEmail={session.user.email}
    >
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--s-6) var(--content-gutter)' }}>
        <div style={{ maxWidth: 800, width: '100%' }}>
          <h2 style={{ margin: 0 }}>Model &amp; Custom Fields</h2>
          <p style={{ font: '400 13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '4px 0 var(--s-5)', maxWidth: 600 }}>
            Daftar entitas yang terdaftar di Platform Registry. Klik salah satu untuk melihat
            field sistem dan menambahkan field kustom khusus workspace Anda.
          </p>

          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1.4 var(--font-sans)' }}>
              <thead style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                <tr>
                  {['Model', 'Key', 'Field sistem', 'Sumber', ''].map((h) => (
                    <th key={h} style={{ padding: '9px 14px', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.model.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 14px', font: '500 13px/1.3 var(--font-sans)', color: 'var(--fg-1)' }}>
                      {m.model.label}
                    </td>
                    <td style={{ padding: '12px 14px', font: '12px/1 var(--font-mono)', color: 'var(--fg-3)' }}>
                      {m.model.key}
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--fg-2)' }}>
                      {m.systemFields.length}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        font: '600 10px/1 var(--font-sans)', textTransform: 'uppercase',
                        letterSpacing: '0.06em', padding: '3px 7px', borderRadius: 999,
                        color: m.model.isSystem ? 'var(--indigo)' : 'var(--teal)',
                        border: `1px solid ${m.model.isSystem ? 'var(--indigo)' : 'var(--teal)'}`,
                      }}>
                        {m.model.isSystem ? 'Sistem' : 'Kustom'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <Link
                        href={`/settings/platform/models/${encodeURIComponent(m.model.key)}`}
                        style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--indigo)', textDecoration: 'none' }}
                      >
                        Atur fields →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SettingsShell>
  )
}
