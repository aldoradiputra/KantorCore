import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listAuditLog } from '../../../lib/admin'

function formatDate(d: Date | string) {
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date(d))
}

const ACTION_COLOR: Record<string, string> = {
  'auth.': 'var(--indigo)',
  'agent.': 'var(--teal)',
  'settings.': 'var(--amber)',
  'member.': 'var(--fg-2)',
}

function actionColor(action: string): string {
  for (const [prefix, color] of Object.entries(ACTION_COLOR)) {
    if (action.startsWith(prefix)) return color
  }
  return 'var(--fg-3)'
}

export default async function AuditLogPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')
  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) redirect('/settings/profile')

  const rows = await listAuditLog(ctx.tenant.id, 200, 0)

  return (
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--s-6) var(--content-gutter)' }}>
        <div style={{ maxWidth: 920, width: '100%' }}>
          <div style={{ marginBottom: 'var(--s-6)' }}>
            <h2 style={{ margin: 0 }}>Log Audit</h2>
            <p style={{ font: '400 13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '4px 0 0' }}>
              200 entri terbaru. Semua perubahan keamanan-sensitif dicatat secara append-only.
            </p>
          </div>

          {rows.length === 0 ? (
            <div style={{ padding: '40px 24px', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
              <div style={{ font: '500 14px/1.4 var(--font-sans)', color: 'var(--fg-2)' }}>Belum ada entri audit.</div>
            </div>
          ) : (
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', font: '12px/1.4 var(--font-sans)' }}>
                <thead style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                  <tr>
                    {['Waktu', 'Aktor', 'Aksi', 'Resource', 'IP'].map((h) => (
                      <th key={h} style={{ padding: '9px 14px', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ entry, actorName, actorEmail }) => (
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
                          <span style={{ color: 'var(--fg-3)' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '9px 14px' }}>
                        <code style={{ font: '500 11px/1 var(--font-mono)', color: actionColor(entry.action), background: 'rgba(0,0,0,0.04)', padding: '2px 5px', borderRadius: 3 }}>
                          {entry.action}
                        </code>
                      </td>
                      <td style={{ padding: '9px 14px', color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                        {entry.resourceType ? `${entry.resourceType}` : '—'}
                        {entry.resourceId && (
                          <span style={{ color: 'var(--fg-3)', marginLeft: 4, fontSize: 10 }}>
                            {entry.resourceId.slice(0, 8)}…
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '9px 14px', color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                        {entry.ip ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
  )
}
