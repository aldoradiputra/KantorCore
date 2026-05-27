import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../lib/auth'
import { getCurrentTenant } from '../../lib/tenants'
import {
  getActivityBuckets,
  getActivityStats,
  listAuditLog,
  pivotBuckets,
} from '../../lib/admin'
import { AppShell } from '../../components/AppShell'
import { ChartCard } from '../../components/charts/ChartCard'
import { ActivityTimeline } from '../../components/charts/ActivityTimeline'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

function formatDate(d: Date | string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(d))
}

const ACTION_COLOR: Record<string, string> = {
  auth:   'var(--indigo)',
  config: 'var(--amber)',
  agent:  'var(--teal)',
  member: '#6B7280',
}

function categoryColor(cat: string) {
  return ACTION_COLOR[cat] ?? 'var(--fg-3)'
}

export default async function OpsPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')
  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) redirect('/settings/profile')

  const [stats, buckets, recent] = await Promise.all([
    getActivityStats(ctx.tenant.id),
    getActivityBuckets(ctx.tenant.id, { granularity: 'day', lookback: 168 }),
    listAuditLog(ctx.tenant.id, 20),
  ])

  const { data: chartData, categories } = pivotBuckets(buckets)

  return (
    <AppShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      userEmail={session.user.email}
      activeModule="ops"
    >
      <div style={{ flex: 1, overflow: 'auto', padding: 'var(--s-6) var(--content-gutter)' }}>
        <div style={{ maxWidth: 960, width: '100%' }}>
          <h2 style={{ margin: '0 0 var(--s-5)' }}>Ops &amp; Aktivitas</h2>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s-3)', marginBottom: 'var(--s-4)' }}>
            <StatCard label="Events 24 Jam" value={stats.eventsLast24h.toLocaleString('id-ID')} />
            <StatCard label="Pengguna Aktif 24 Jam" value={stats.activeUsersLast24h.toLocaleString('id-ID')} />
            <StatCard
              label="Kategori Terbanyak"
              value={stats.topCategory ?? '—'}
              valueStyle={{ textTransform: 'capitalize', color: stats.topCategory ? categoryColor(stats.topCategory) : 'var(--fg-3)' }}
            />
          </div>

          {/* 7-day chart */}
          <ChartCard title="Aktivitas 7 Hari" subtitle="Event per hari berdasarkan kategori aksi" style={{ marginBottom: 'var(--s-4)' }}>
            <ActivityTimeline data={chartData} categories={categories} granularity="day" height={240} />
          </ChartCard>

          {/* Recent events table */}
          <div style={{ font: '600 11px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-3)', marginBottom: 'var(--s-2)' }}>
            Aktivitas Terbaru
          </div>
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
            {recent.length === 0 ? (
              <div style={{ padding: '32px 20px', textAlign: 'center', font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)' }}>
                Belum ada aktivitas yang tercatat.
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', font: '12px/1.4 var(--font-sans)' }}>
                <thead style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                  <tr>
                    {['Waktu', 'Aktor', 'Aksi', 'Resource'].map((h) => (
                      <th key={h} style={{ padding: '8px 14px', font: '600 10px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recent.map(({ entry, actorName, actorEmail }) => {
                    const cat = entry.action.split('.')[0] ?? ''
                    return (
                      <tr key={entry.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '9px 14px', color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'nowrap' }}>
                          {formatDate(entry.createdAt)}
                        </td>
                        <td style={{ padding: '9px 14px' }}>
                          {actorName ? (
                            <div>
                              <div style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{actorName}</div>
                              <div style={{ font: '10px/1 var(--font-sans)', color: 'var(--fg-3)', marginTop: 2 }}>{actorEmail}</div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--fg-3)' }}>Sistem</span>
                          )}
                        </td>
                        <td style={{ padding: '9px 14px' }}>
                          <code style={{ font: '500 11px/1 var(--font-mono)', color: categoryColor(cat) }}>
                            {entry.action}
                          </code>
                        </td>
                        <td style={{ padding: '9px 14px', color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                          {entry.resourceType ?? '—'}
                          {entry.resourceId ? ` · ${entry.resourceId.slice(0, 8)}…` : ''}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function StatCard({
  label,
  value,
  valueStyle,
}: {
  label: string
  value: string
  valueStyle?: React.CSSProperties
}) {
  return (
    <div style={{
      padding: 'var(--s-4)',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-md)',
    }}>
      <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', marginBottom: 'var(--s-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ font: '700 28px/1 var(--font-sans)', color: 'var(--fg-1)', ...valueStyle }}>
        {value}
      </div>
    </div>
  )
}
