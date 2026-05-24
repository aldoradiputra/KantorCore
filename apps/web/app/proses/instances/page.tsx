import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listInstances } from '../../../lib/platform/workflow-executor'
import { AppShell } from '../../../components/AppShell'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu',
  running: 'Berjalan',
  paused: 'Jeda',
  completed: 'Selesai',
  failed: 'Gagal',
  cancelled: 'Dibatalkan',
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'var(--fg-3)',
  running: 'var(--indigo)',
  paused: 'var(--amber)',
  completed: 'var(--teal)',
  failed: '#c0392b',
  cancelled: 'var(--fg-3)',
}

export default async function InstancesPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const instances = await listInstances(ctx.tenant.id)

  return (
    <AppShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeModule="proses"
    >
      <div style={{ padding: 'var(--s-6)', maxWidth: 880, display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--s-3)' }}>
          <div>
            <div style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)', marginBottom: 8 }}>
              <Link href="/proses" style={{ color: 'var(--fg-3)', textDecoration: 'none' }}>
                Pustaka Proses
              </Link>
              <span style={{ margin: '0 6px' }}>›</span>
              Instance
            </div>
            <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>
              Instance Proses
            </h1>
          </div>
        </div>

        {instances.length === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              border: '1px dashed var(--border)',
              borderRadius: 'var(--r-md)',
              font: '14px/1.5 var(--font-sans)',
              color: 'var(--fg-3)',
            }}
          >
            Belum ada proses yang dijalankan.
            <br />
            Buka halaman detail proses dan klik <b>Jalankan Proses</b>.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {instances.map((inst) => {
              const sc = STATUS_COLOR[inst.status] ?? 'var(--fg-3)'
              return (
                <Link
                  key={inst.id}
                  href={`/proses/instances/${inst.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--s-4)',
                    padding: '14px 16px',
                    border: '1px solid var(--border)',
                    borderLeft: `3px solid ${sc}`,
                    borderRadius: 'var(--r-md)',
                    background: 'var(--surface)',
                    textDecoration: 'none',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                    <span
                      style={{
                        font: '600 10px/1 var(--font-sans)',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: sc,
                      }}
                    >
                      {STATUS_LABEL[inst.status] ?? inst.status}
                    </span>
                    <span style={{ font: '12px/1 var(--font-mono, monospace)', color: 'var(--fg-3)' }}>
                      {inst.id}
                    </span>
                    {inst.triggerRecordType && (
                      <span style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
                        Dipicu oleh: {inst.triggerRecordType}
                      </span>
                    )}
                  </div>
                  <div style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)', flexShrink: 0 }}>
                    Langkah {inst.currentSequence} →
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
