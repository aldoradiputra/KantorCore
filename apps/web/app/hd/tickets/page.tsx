import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listTickets, getTicketStats } from '../../../lib/helpdesk'
import type { TicketStatus, TicketPriority } from '../../../lib/helpdesk'

const STATUS_LABEL: Record<TicketStatus, string> = {
  new:      'Baru',
  open:     'Terbuka',
  pending:  'Menunggu',
  resolved: 'Selesai',
  closed:   'Ditutup',
}

const STATUS_COLOR: Record<TicketStatus, { bg: string; fg: string }> = {
  new:      { bg: 'var(--indigo-light)', fg: 'var(--indigo)' },
  open:     { bg: 'var(--teal-light)',   fg: 'var(--success)' },
  pending:  { bg: 'var(--bg)',           fg: 'var(--fg-2)' },
  resolved: { bg: 'var(--bg)',           fg: 'var(--fg-3)' },
  closed:   { bg: 'var(--bg)',           fg: 'var(--fg-3)' },
}

const PRIORITY_COLOR: Record<TicketPriority, string> = {
  low:    'var(--fg-3)',
  medium: 'var(--fg-2)',
  high:   'var(--amber)',
  urgent: 'var(--danger)',
}

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  low: 'Rendah', medium: 'Sedang', high: 'Tinggi', urgent: 'Mendesak',
}

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const { status } = await searchParams
  const [tickets, stats] = await Promise.all([
    listTickets(ctx.tenant.id, { status: (status as TicketStatus) || undefined }),
    getTicketStats(ctx.tenant.id),
  ])

  const STATUSES: Array<TicketStatus | 'all'> = ['all', 'new', 'open', 'pending', 'resolved', 'closed']

  return (
    <div style={{ padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ font: '600 20px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>
            Help Desk
          </h1>
          <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '4px 0 0' }}>
            {stats.total} tiket · {stats.overdueCount > 0 && (
              <span style={{ color: 'var(--danger)' }}>{stats.overdueCount} melewati SLA</span>
            )}
          </p>
        </div>
        <Link
          href="/hd/tickets/new"
          style={{
            height: 36, padding: '0 var(--s-4)', background: 'var(--indigo)',
            color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)',
            font: '600 13px/36px var(--font-sans)', textDecoration: 'none', display: 'inline-block',
          }}
        >
          + Tiket Baru
        </Link>
      </div>

      {/* Stat pills */}
      <div style={{ display: 'flex', gap: 'var(--s-3)', flexWrap: 'wrap' }}>
        {(['new', 'open', 'pending', 'resolved'] as TicketStatus[]).map((s) => (
          <Link
            key={s}
            href={`/hd/tickets?status=${s}`}
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              font: '600 12px/1 var(--font-sans)',
              background: STATUS_COLOR[s].bg,
              color: STATUS_COLOR[s].fg,
              border: `1px solid ${status === s ? STATUS_COLOR[s].fg : 'transparent'}`,
              textDecoration: 'none',
            }}
          >
            {STATUS_LABEL[s]} ({stats.byStatus[s] ?? 0})
          </Link>
        ))}
        {status && (
          <Link href="/hd/tickets" style={{ padding: '6px 12px', font: '12px/1 var(--font-sans)', color: 'var(--fg-3)', textDecoration: 'none' }}>
            ✕ Hapus filter
          </Link>
        )}
      </div>

      {/* Ticket table */}
      {tickets.length === 0 ? (
        <div style={{ padding: 'var(--s-8)', textAlign: 'center', font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)' }}>
          Tidak ada tiket.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1 var(--font-sans)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Tiket', 'Subjek', 'Prioritas', 'Status', 'Dibuat'].map((h) => (
                <th key={h} style={{ padding: 'var(--s-2) var(--s-3)', textAlign: 'left', font: '500 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => {
              const now = new Date()
              const overdue = t.slaDueAt && t.slaDueAt < now && t.status !== 'resolved' && t.status !== 'closed'
              return (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 'var(--s-3)', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-3)' }}>
                    {t.ticketNumber}
                  </td>
                  <td style={{ padding: 'var(--s-3)' }}>
                    <Link href={`/hd/tickets/${t.id}`} style={{ color: overdue ? 'var(--danger)' : 'var(--fg-1)', fontWeight: 500, textDecoration: 'none' }}>
                      {t.subject}
                      {overdue && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--danger)' }}>⏰ SLA</span>}
                    </Link>
                    {t.reporterName && (
                      <div style={{ font: '12px/1.4 var(--font-sans)', color: 'var(--fg-3)', marginTop: 2 }}>
                        {t.reporterName}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: 'var(--s-3)', fontWeight: 600, fontSize: 12, color: PRIORITY_COLOR[t.priority] }}>
                    {PRIORITY_LABEL[t.priority]}
                  </td>
                  <td style={{ padding: 'var(--s-3)' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                      background: STATUS_COLOR[t.status].bg, color: STATUS_COLOR[t.status].fg,
                    }}>
                      {STATUS_LABEL[t.status]}
                    </span>
                  </td>
                  <td style={{ padding: 'var(--s-3)', color: 'var(--fg-3)', fontSize: 12 }}>
                    {new Date(t.createdAt).toLocaleDateString('id-ID')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
