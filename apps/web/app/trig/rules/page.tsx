import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listTriggerRules, listTriggerLogs, EVENT_LABEL, ACTION_LABEL } from '../../../lib/triggers'
import { TrigShell } from '../TrigShell'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function TrigRulesPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const rules = await listTriggerRules(ctx.tenant.id)
  const recentLogs = await listTriggerLogs(ctx.tenant.id)

  return (
    <TrigShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeSection="rules"
    >
      <div style={{ padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-5)', maxWidth: 900, overflowY: 'auto' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Event Triggers</h1>
            <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '6px 0 0' }}>
              Jalankan aksi otomatis (pesan chat atau webhook) saat event bisnis terjadi.
            </p>
          </div>
          <Link
            href="/trig/rules/new"
            style={{
              display: 'inline-flex', alignItems: 'center', height: 36,
              padding: '0 var(--s-4)', background: 'var(--indigo)', color: 'var(--white)',
              borderRadius: 'var(--r-sm)', font: '600 13px/1 var(--font-sans)', textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            + Tambah Rule
          </Link>
        </header>

        {rules.length === 0 ? (
          <div style={{
            border: '1px dashed var(--border)', borderRadius: 'var(--r-md)',
            padding: 'var(--s-7)', textAlign: 'center', color: 'var(--fg-3)',
            font: '13px/1.5 var(--font-sans)',
          }}>
            Belum ada trigger rule. Buat rule pertama untuk mengotomasi notifikasi.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
            {rules.map((rule) => (
              <div key={rule.id} style={{
                border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
                background: 'var(--surface)', padding: 'var(--s-4)',
                display: 'flex', alignItems: 'flex-start', gap: 'var(--s-4)',
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: 5,
                  background: rule.status === 'active' ? 'var(--teal)' : 'var(--border-strong)',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: '600 14px/1.2 var(--font-sans)', color: 'var(--fg-1)' }}>{rule.name}</div>
                  {rule.description && (
                    <div style={{ font: '12px/1.4 var(--font-sans)', color: 'var(--fg-3)', marginTop: 2 }}>{rule.description}</div>
                  )}
                  <div style={{ display: 'flex', gap: 'var(--s-2)', marginTop: 'var(--s-2)', flexWrap: 'wrap' }}>
                    <Chip label={EVENT_LABEL[rule.event]} color="indigo" />
                    <Chip label={ACTION_LABEL[rule.action]} color="teal" />
                  </div>
                </div>
                <RuleActions rule={rule} />
              </div>
            ))}
          </div>
        )}

        {recentLogs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
            <div className="t-micro">Log Terbaru</div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', font: '12px/1.4 var(--font-sans)' }}>
                <thead style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                  <tr>
                    <Th>Event</Th>
                    <Th>Status</Th>
                    <Th>Respons</Th>
                    <Th>Waktu</Th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.slice(0, 20).map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <Td><span style={{ font: '11px/1 var(--font-mono)', color: 'var(--fg-2)' }}>{log.event}</span></Td>
                      <Td>
                        <span style={{
                          font: '600 10px/1 var(--font-sans)', letterSpacing: '0.06em',
                          textTransform: 'uppercase', padding: '2px 6px', borderRadius: 999,
                          color: log.ok ? 'var(--teal)' : 'var(--danger,#c33)',
                          border: `1px solid ${log.ok ? 'var(--teal)' : 'var(--danger,#c33)'}`,
                        }}>{log.ok ? 'OK' : 'GAGAL'}</span>
                      </Td>
                      <Td style={{ color: 'var(--fg-3)' }}>{log.response ?? '—'}</Td>
                      <Td style={{ color: 'var(--fg-3)' }}>{new Date(log.firedAt).toLocaleString('id-ID')}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </TrigShell>
  )
}

function Chip({ label, color }: { label: string; color: 'indigo' | 'teal' }) {
  return (
    <span style={{
      font: '500 11px/1 var(--font-sans)', padding: '3px 8px', borderRadius: 999,
      color: `var(--${color})`, border: `1px solid var(--${color})`,
      background: `var(--${color}-light, transparent)`,
    }}>{label}</span>
  )
}

function RuleActions({ rule }: { rule: { id: string; status: string } }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--s-2)', flexShrink: 0 }}>
      <form action={`/api/trig/rules/${rule.id}`} method="DELETE" style={{ display: 'inline' }}>
        <button
          type="submit"
          style={{
            height: 28, padding: '0 10px', border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)', background: 'transparent',
            font: '12px/1 var(--font-sans)', color: 'var(--fg-3)', cursor: 'pointer',
          }}
        >
          Hapus
        </button>
      </form>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={{ textAlign: 'left', padding: '8px 12px', font: '600 10px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{children}</th>
}
function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ textAlign: 'left', padding: '10px 12px', color: 'var(--fg-1)', ...style }}>{children}</td>
}
