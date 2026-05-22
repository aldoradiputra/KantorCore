import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { getPO, poSubtotal } from '../../../../lib/procurement'
import { ProcShell } from '../../ProcShell'
import { POActions } from './POActions'
import { Chatter } from '../../../../components/chatter/Chatter'

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

export default async function PODetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const data = await getPO(ctx.tenant.id, id)
  if (!data) notFound()

  const { po, lines, vendorContact } = data
  const color = STATUS_COLOR[po.status] ?? 'var(--fg-3)'
  const subtotal = poSubtotal(lines)

  return (
    <ProcShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeSection="orders"
    >
      <div style={{ padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-5)', maxWidth: 900 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--s-4)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <Link href="/proc/orders" style={{ font: '13px/1 var(--font-sans)', color: 'var(--fg-3)', textDecoration: 'none' }}>← Pesanan</Link>
            </div>
            <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0, fontFamily: 'var(--font-mono, monospace)' }}>{po.poNumber}</h1>
          </div>
          <span style={{ font: '600 11px/1 var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '5px 10px', borderRadius: 999, color, border: `1px solid ${color}`, flexShrink: 0 }}>
            {STATUS_LABEL[po.status] ?? po.status}
          </span>
        </div>

        {/* Header info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-4)', padding: 'var(--s-4)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface)' }}>
          <InfoRow label="Vendor" value={po.vendorName} />
          {vendorContact && <InfoRow label="Kontak" value={vendorContact.name + (vendorContact.email ? ` · ${vendorContact.email}` : '')} />}
          <InfoRow label="Tanggal PO" value={po.date} />
          {po.expectedDate && <InfoRow label="Tgl Ekspektasi" value={po.expectedDate} />}
          {po.notes && <InfoRow label="Catatan" value={po.notes} />}
          {po.billId && (
            <InfoRow label="Tagihan" value={
              <Link href={`/fin/bills/${po.billId}`} style={{ color: 'var(--indigo)', textDecoration: 'none' }}>Lihat tagihan →</Link>
            } />
          )}
        </div>

        {/* Lines */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1.4 var(--font-sans)' }}>
            <thead style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
              <tr>
                <Th>Deskripsi</Th>
                <Th>Produk</Th>
                <Th align="right">Qty</Th>
                <Th align="right">Diterima</Th>
                <Th align="right">Harga</Th>
                <Th align="right">Subtotal</Th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <Td>{l.description}</Td>
                  <Td>{l.productName ?? '—'}</Td>
                  <Td align="right" mono>{l.qty}</Td>
                  <Td align="right" mono>{l.receivedQty}</Td>
                  <Td align="right" mono>{formatIDR(l.unitPrice)}</Td>
                  <Td align="right" mono>{formatIDR(l.qty * l.unitPrice)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '12px 14px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 200 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24 }}>
                <span style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--fg-2)' }}>Subtotal</span>
                <span style={{ font: '600 16px/1 var(--font-mono, monospace)', color: 'var(--fg-1)' }}>{formatIDR(subtotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        {po.status !== 'cancelled' && po.status !== 'billed' && (
          <POActions id={po.id} status={po.status} />
        )}

        <div>
          <div style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--s-3)' }}>
            Komunikasi
          </div>
          <Chatter entityType="proc.order" entityId={po.id} />
        </div>
      </div>
    </ProcShell>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
      <div style={{ font: '13px/1.4 var(--font-sans)', color: 'var(--fg-1)' }}>{value}</div>
    </div>
  )
}

function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return <th style={{ textAlign: align ?? 'left', padding: '10px 14px', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{children}</th>
}
function Td({ children, align, mono }: { children: React.ReactNode; align?: 'right'; mono?: boolean }) {
  return <td style={{ textAlign: align ?? 'left', padding: '12px 14px', color: 'var(--fg-1)', fontFamily: mono ? 'var(--font-mono, monospace)' : undefined }}>{children}</td>
}
