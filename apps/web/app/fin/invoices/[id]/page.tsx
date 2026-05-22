import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { getInvoice, formatIDR, DOC_STATUS_LABEL, DOC_STATUS_COLOR, getInvoiceTaxBreakdown, listTaxes } from '../../../../lib/finance'
import { FinShell } from '../../FinShell'
import { InvoiceActions } from './InvoiceActions'
import { Chatter } from '../../../../components/chatter/Chatter'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const data = await getInvoice(ctx.tenant.id, id)
  if (!data) notFound()

  const { invoice, lines, total } = data
  const statusColor = DOC_STATUS_COLOR[invoice.status] ?? 'var(--fg-3)'
  const [breakdown, allTaxes] = await Promise.all([
    getInvoiceTaxBreakdown(ctx.tenant.id, id),
    listTaxes(ctx.tenant.id, { scope: 'sale' }),
  ])
  const taxById = new Map(allTaxes.map((t) => [t.id, t]))

  return (
    <FinShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeSection="invoices"
    >
      <div style={{ padding: 'var(--s-6)', maxWidth: 880, display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        <div style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
          <Link href="/fin/invoices" style={{ color: 'var(--fg-3)', textDecoration: 'none' }}>Faktur Pelanggan</Link>
          <span style={{ margin: '0 6px' }}>›</span>
          <span>{invoice.invoiceNumber}</span>
        </div>

        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--s-3)', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0, fontFamily: 'var(--font-mono, monospace)' }}>
              {invoice.invoiceNumber}
            </h1>
            <div style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-2)', marginTop: 4 }}>
              {invoice.customerName}{invoice.customerEmail ? ` · ${invoice.customerEmail}` : ''}
            </div>
          </div>
          <span style={{
            font: '600 11px/1 var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase',
            padding: '6px 10px', borderRadius: 999, color: statusColor, border: `1px solid ${statusColor}`,
          }}>
            {DOC_STATUS_LABEL[invoice.status] ?? invoice.status}
          </span>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
          <MetaPair label="Tanggal" value={invoice.date} />
          <MetaPair label="Jatuh Tempo" value={invoice.dueDate} />
        </div>

        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1.4 var(--font-sans)' }}>
            <thead style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
              <tr>
                <Th>Deskripsi</Th>
                <Th>Akun</Th>
                <Th align="right">Qty</Th>
                <Th align="right">Harga</Th>
                <Th align="right">Subtotal</Th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const lineTaxNames = l.taxIds.map((id) => taxById.get(id)?.name).filter(Boolean) as string[]
                return (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <Td>
                      {l.description}
                      {invoice.displayTaxInline && lineTaxNames.length > 0 && (
                        <div style={{ font: '11px/1.4 var(--font-sans)', color: 'var(--fg-3)', marginTop: 2 }}>Pajak: {lineTaxNames.join(', ')}</div>
                      )}
                    </Td>
                    <Td><span style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--fg-3)' }}>{l.accountCode}</span> {l.accountName}</Td>
                    <Td align="right">{l.quantity}</Td>
                    <Td align="right" mono>{formatIDR(l.unitPrice)}</Td>
                    <Td align="right" mono>{formatIDR(l.quantity * l.unitPrice)}</Td>
                  </tr>
                )
              })}
              <tr>
                <Td colSpan={4} align="right">Subtotal</Td>
                <Td align="right" mono>{formatIDR(total)}</Td>
              </tr>
              {breakdown.taxLines.filter((t) => !t.isWithholding).map((t) => (
                <tr key={t.taxId}>
                  <Td colSpan={4} align="right" muted>{t.taxName}</Td>
                  <Td align="right" mono muted>{formatIDR(t.amount)}</Td>
                </tr>
              ))}
              <tr style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
                <Td colSpan={4} align="right"><b>Total Faktur</b></Td>
                <Td align="right" mono><b>{formatIDR(breakdown.grandTotal)}</b></Td>
              </tr>
              {breakdown.taxLines.filter((t) => t.isWithholding).map((t) => (
                <tr key={t.taxId}>
                  <Td colSpan={4} align="right" muted>{t.taxName} (dipotong pelanggan)</Td>
                  <Td align="right" mono muted>−{formatIDR(t.amount)}</Td>
                </tr>
              ))}
              {breakdown.withholdingTotal > 0 && (
                <tr style={{ background: 'var(--bg)' }}>
                  <Td colSpan={4} align="right"><b>Diterima (net)</b></Td>
                  <Td align="right" mono><b>{formatIDR(breakdown.netSettlement)}</b></Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {invoice.notes && (
          <div style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 'var(--r-md)', font: '13px/1.55 var(--font-sans)', color: 'var(--fg-2)' }}>
            {invoice.notes}
          </div>
        )}

        <InvoiceActions invoiceId={invoice.id} status={invoice.status} journalEntryId={invoice.journalEntryId} />

        <div>
          <div style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--s-3)' }}>
            Komunikasi
          </div>
          <Chatter entityType="fin.invoice" entityId={invoice.id} />
        </div>
      </div>
    </FinShell>
  )
}

function MetaPair({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ font: '600 10px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ font: '13px/1.3 var(--font-sans)', color: 'var(--fg-1)' }}>{value}</span>
    </div>
  )
}

function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return <th style={{ textAlign: align ?? 'left', padding: '10px 14px', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{children}</th>
}

function Td({ children, align, mono, colSpan, muted }: { children: React.ReactNode; align?: 'right'; mono?: boolean; colSpan?: number; muted?: boolean }) {
  return <td colSpan={colSpan} style={{ textAlign: align ?? 'left', padding: muted ? '6px 14px' : '12px 14px', color: muted ? 'var(--fg-3)' : 'var(--fg-1)', fontFamily: mono ? 'var(--font-mono, monospace)' : undefined, font: muted ? '12px/1.3 var(--font-sans)' : undefined }}>{children}</td>
}
