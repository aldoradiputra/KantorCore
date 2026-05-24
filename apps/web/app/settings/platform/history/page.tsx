import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { listAuditLog } from '../../../../lib/admin'
import { CONFIG_AUDIT_PREFIX } from '../../../../lib/platform/audit-config'
import { SettingsShell } from '../../SettingsShell'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

function formatDate(d: Date | string) {
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date(d))
}

const VERB_COLOR: Record<string, string> = {
  created: 'var(--teal)',
  granted: 'var(--teal)',
  enabled: 'var(--teal)',
  updated: 'var(--indigo)',
  deleted: '#c0392b',
  revoked: '#c0392b',
  disabled: 'var(--amber)',
}

function parseAction(action: string): { resource: string; verb: string } {
  const parts = action.split('.')
  return { resource: parts[1] ?? '—', verb: parts[2] ?? '—' }
}

function summarisePayload(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const p = payload as Record<string, unknown>
  if (typeof p.name === 'string') return p.name
  if (typeof p.key === 'string') return p.key
  if (Array.isArray(p.changed) && p.changed.length > 0) return p.changed.join(', ')
  return ''
}

export default async function ConfigHistoryPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')
  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) redirect('/settings/profile')

  const rows = await listAuditLog(ctx.tenant.id, 200, 0, { actionPrefix: CONFIG_AUDIT_PREFIX })

  return (
    <SettingsShell
      activeSection="platform-history"
      isAdmin={isAdmin}
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      userEmail={session.user.email}
    >
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--s-6) var(--content-gutter)' }}>
        <div style={{ maxWidth: 960, width: '100%' }}>
          <div style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)', marginBottom: 'var(--s-3)' }}>
            <Link href="/settings" style={{ color: 'var(--fg-3)', textDecoration: 'none' }}>Settings</Link>
            <span style={{ margin: '0 6px' }}>›</span>
            Platform · Riwayat Konfigurasi
          </div>
          <div style={{ marginBottom: 'var(--s-6)' }}>
            <h2 style={{ margin: 0 }}>Riwayat Konfigurasi</h2>
            <p style={{ font: '400 13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '4px 0 0', maxWidth: 720 }}>
              200 perubahan konfigurasi terbaru — model, field, policy, role, view, trigger.
              Audit penuh tersedia di{' '}
              <Link href="/settings/audit" style={{ color: 'var(--indigo)', textDecoration: 'none' }}>Log Audit</Link>.
            </p>
          </div>

          {rows.length === 0 ? (
            <div style={{ padding: '40px 24px', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
              <div style={{ font: '500 14px/1.4 var(--font-sans)', color: 'var(--fg-2)' }}>
                Belum ada perubahan konfigurasi yang tercatat.
              </div>
            </div>
          ) : (
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', font: '12px/1.4 var(--font-sans)' }}>
                <thead style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                  <tr>
                    {['Waktu', 'Aktor', 'Resource', 'Aksi', 'Detail'].map((h) => (
                      <th key={h} style={{ padding: '9px 14px', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ entry, actorName, actorEmail }) => {
                    const { resource, verb } = parseAction(entry.action)
                    const detail = summarisePayload(entry.payload)
                    return (
                      <tr key={entry.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '9px 14px', color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'nowrap' }}>
                          {formatDate(entry.createdAt)}
                        </td>
                        <td style={{ padding: '9px 14px' }}>
                          {actorName ? (
                            <div>
                              <div style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{actorName}</div>
                              <div style={{ font: '400 11px/1 var(--font-sans)', color: 'var(--fg-3)', marginTop: 2 }}>{actorEmail}</div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--fg-3)' }}>Sistem</span>
                          )}
                        </td>
                        <td style={{ padding: '9px 14px' }}>
                          <code style={{ font: '500 11px/1 var(--font-mono)', color: 'var(--fg-2)' }}>
                            {resource}
                          </code>
                          {entry.resourceId && (
                            <div style={{ color: 'var(--fg-3)', marginTop: 2, fontSize: 10, fontFamily: 'var(--font-mono)' }}>
                              {entry.resourceId.slice(0, 8)}…
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '9px 14px' }}>
                          <span style={{
                            font: '600 10px/1 var(--font-sans)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            color: VERB_COLOR[verb] ?? 'var(--fg-3)',
                            padding: '3px 7px',
                            borderRadius: 3,
                            border: `1px solid ${VERB_COLOR[verb] ?? 'var(--border)'}`,
                          }}>
                            {verb}
                          </span>
                        </td>
                        <td style={{ padding: '9px 14px', color: 'var(--fg-2)', fontSize: 12 }}>
                          {detail || <span style={{ color: 'var(--fg-3)' }}>—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </SettingsShell>
  )
}
