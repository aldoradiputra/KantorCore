import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listSOs } from '../../../lib/sales'
import { SalesShell } from '../SalesShell'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

const STATUS_LABEL: Record<string, string> = {
  quotation: 'Penawaran',
  confirmed: 'Dikonfirmasi',
  done:      'Selesai',
  cancelled: 'Dibatalkan',
}
const STATUS_COLOR: Record<string, string> = {
  quotation: 'var(--fg-3)',
  confirmed: 'var(--indigo)',
  done:      'var(--teal)',
  cancelled: 'var(--danger)',
}

export default async function SalesOrdersPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const orders = await listSOs(ctx.tenant.id)

  return (
    <SalesShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeSection="orders"
    >
      <div style={{ padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-4)', maxWidth: 1100 }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--s-4)' }}>
          <div>
            <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Penawaran & Penjualan</h1>
            <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '6px 0 0', maxWidth: 640 }}>
              Buat penawaran kepada pelanggan, konfirmasi menjadi sales order, lalu tagihkan ke faktur.
            </p>
          </div>
          <Link
            href="/sales/orders/new"
            style={{ padding: '8px 14px', borderRadius: 'var(--r-md)', background: 'var(--indigo)', color: 'white', font: '600 13px/1 var(--font-sans)', textDecoration: 'none', flexShrink: 0 }}
          >
            + Penawaran Baru
          </Link>
        </header>

        {orders.length === 0 ? (
          <div style={{ padding: '40px 24px', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface)', textAlign: 'center' }}>
            <div style={{ font: '500 14px/1.4 var(--font-sans)', color: 'var(--fg-2)' }}>Belum ada penawaran atau sales order.</div>
          </div>
        ) : (
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1.4 var(--font-sans)' }}>
              <thead style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                <tr>
                  <Th>Nomor</Th>
                  <Th>Pelanggan</Th>
                  <Th>Tanggal</Th>
                  <Th>Berlaku Hingga</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {orders.map((so) => {
                  const color = STATUS_COLOR[so.status] ?? 'var(--fg-3)'
                  return (
                    <tr key={so.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <Td>
                        <Link href={`/sales/orders/${so.id}`} style={{ color: 'var(--indigo)', textDecoration: 'none', fontFamily: 'var(--font-mono, monospace)' }}>
                          {so.soNumber}
                        </Link>
                      </Td>
                      <Td>{so.customerName}</Td>
                      <Td>{so.date}</Td>
                      <Td>{so.expiryDate ?? '—'}</Td>
                      <Td>
                        <span style={{ font: '600 10px/1 var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 7px', borderRadius: 999, color, border: `1px solid ${color}` }}>
                          {STATUS_LABEL[so.status] ?? so.status}
                        </span>
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SalesShell>
  )
}

function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return <th style={{ textAlign: align ?? 'left', padding: '10px 14px', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{children}</th>
}
function Td({ children, align, mono }: { children: React.ReactNode; align?: 'right'; mono?: boolean }) {
  return <td style={{ textAlign: align ?? 'left', padding: '12px 14px', color: 'var(--fg-1)', fontFamily: mono ? 'var(--font-mono, monospace)' : undefined }}>{children}</td>
}
