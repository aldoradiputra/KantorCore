import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listInvoices, formatIDR, DOC_STATUS_LABEL, DOC_STATUS_COLOR } from '../../../lib/finance'
import { FinShell } from '../FinShell'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function InvoicesPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const list = await listInvoices(ctx.tenant.id)

  return (
    <FinShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeSection="invoices"
    >
      <div style={{ padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-4)', maxWidth: 1100 }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--s-4)' }}>
          <div>
            <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Faktur Pelanggan</h1>
            <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '6px 0 0', maxWidth: 640 }}>
              Faktur diterbitkan ke pelanggan. Konfirmasi faktur akan mencatat jurnal akuntansi otomatis (debit Piutang, kredit Pendapatan).
            </p>
          </div>
          <Link
            href="/fin/invoices/new"
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--r-md)',
              background: 'var(--indigo)',
              color: 'white',
              font: '600 13px/1 var(--font-sans)',
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            + Faktur Baru
          </Link>
        </header>

        {list.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1.4 var(--font-sans)' }}>
              <thead style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                <tr>
                  <Th>Nomor</Th>
                  <Th>Pelanggan</Th>
                  <Th>Tanggal</Th>
                  <Th>Jatuh Tempo</Th>
                  <Th align="right">Total</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {list.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <Td>
                      <Link href={`/fin/invoices/${inv.id}`} style={{ color: 'var(--indigo)', textDecoration: 'none', fontFamily: 'var(--font-mono, monospace)' }}>
                        {inv.invoiceNumber}
                      </Link>
                    </Td>
                    <Td>{inv.customerName}</Td>
                    <Td>{inv.date}</Td>
                    <Td>{inv.dueDate}</Td>
                    <Td align="right" mono>{formatIDR(inv.total)}</Td>
                    <Td>
                      <StatusBadge status={inv.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </FinShell>
  )
}

function EmptyState() {
  return (
    <div
      style={{
        padding: '40px 24px',
        border: '1px dashed var(--border)',
        borderRadius: 'var(--r-md)',
        background: 'var(--surface)',
        textAlign: 'center',
      }}
    >
      <div style={{ font: '500 14px/1.4 var(--font-sans)', color: 'var(--fg-2)' }}>Belum ada faktur.</div>
      <div style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', marginTop: 4 }}>
        Buat faktur pertama untuk mulai mencatat piutang.
      </div>
    </div>
  )
}

function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return (
    <th style={{
      textAlign: align ?? 'left',
      padding: '10px 14px',
      font: '600 11px/1 var(--font-sans)',
      color: 'var(--fg-3)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
    }}>{children}</th>
  )
}

function Td({ children, align, mono }: { children: React.ReactNode; align?: 'right'; mono?: boolean }) {
  return (
    <td style={{
      textAlign: align ?? 'left',
      padding: '12px 14px',
      color: 'var(--fg-1)',
      fontFamily: mono ? 'var(--font-mono, monospace)' : undefined,
    }}>{children}</td>
  )
}

function StatusBadge({ status }: { status: string }) {
  const color = DOC_STATUS_COLOR[status] ?? 'var(--fg-3)'
  return (
    <span
      style={{
        font: '600 10px/1 var(--font-sans)',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        padding: '3px 7px',
        borderRadius: 999,
        color,
        border: `1px solid ${color}`,
      }}
    >
      {DOC_STATUS_LABEL[status] ?? status}
    </span>
  )
}
