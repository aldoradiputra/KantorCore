import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listPOs, poSubtotal } from '../../../lib/procurement'
import { ProcShell } from '../ProcShell'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

const STATUS_LABEL: Record<string, string> = {
  draft:     'Draft',
  confirmed: 'Dikonfirmasi',
  received:  'Diterima',
  billed:    'Ditagih',
  cancelled: 'Dibatalkan',
}
const STATUS_COLOR: Record<string, string> = {
  draft:     'var(--fg-3)',
  confirmed: 'var(--indigo)',
  received:  'var(--teal)',
  billed:    'var(--amber)',
  cancelled: 'var(--danger)',
}

function formatIDR(v: number) {
  return 'Rp ' + v.toLocaleString('id-ID')
}

export default async function ProcOrdersPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const orders = await listPOs(ctx.tenant.id)

  return (
    <ProcShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeSection="orders"
    >
      <div style={{ padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-4)', maxWidth: 1100 }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--s-4)' }}>
          <div>
            <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Pesanan Pembelian</h1>
            <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '6px 0 0', maxWidth: 640 }}>
              Purchase order kepada vendor. Konfirmasi → Penerimaan mencatat pergerakan stok, lalu buat tagihan.
            </p>
          </div>
          <Link
            href="/proc/orders/new"
            style={{ padding: '8px 14px', borderRadius: 'var(--r-md)', background: 'var(--indigo)', color: 'white', font: '600 13px/1 var(--font-sans)', textDecoration: 'none', flexShrink: 0 }}
          >
            + PO Baru
          </Link>
        </header>

        {orders.length === 0 ? (
          <div style={{ padding: '40px 24px', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface)', textAlign: 'center' }}>
            <div style={{ font: '500 14px/1.4 var(--font-sans)', color: 'var(--fg-2)' }}>Belum ada pesanan pembelian.</div>
          </div>
        ) : (
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1.4 var(--font-sans)' }}>
              <thead style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                <tr>
                  <Th>Nomor PO</Th>
                  <Th>Vendor</Th>
                  <Th>Tanggal</Th>
                  <Th>Tgl Ekspektasi</Th>
                  <Th align="right">Subtotal</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {orders.map((po) => {
                  const color = STATUS_COLOR[po.status] ?? 'var(--fg-3)'
                  return (
                    <tr key={po.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <Td>
                        <Link href={`/proc/orders/${po.id}`} style={{ color: 'var(--indigo)', textDecoration: 'none', fontFamily: 'var(--font-mono, monospace)' }}>
                          {po.poNumber}
                        </Link>
                      </Td>
                      <Td>{po.vendorName}</Td>
                      <Td>{po.date}</Td>
                      <Td>{po.expectedDate ?? '—'}</Td>
                      <Td align="right" mono>—</Td>
                      <Td>
                        <span style={{ font: '600 10px/1 var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 7px', borderRadius: 999, color, border: `1px solid ${color}` }}>
                          {STATUS_LABEL[po.status] ?? po.status}
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
    </ProcShell>
  )
}

function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return <th style={{ textAlign: align ?? 'left', padding: '10px 14px', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{children}</th>
}
function Td({ children, align, mono }: { children: React.ReactNode; align?: 'right'; mono?: boolean }) {
  return <td style={{ textAlign: align ?? 'left', padding: '12px 14px', color: 'var(--fg-1)', fontFamily: mono ? 'var(--font-mono, monospace)' : undefined }}>{children}</td>
}
