import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { getBill, formatIDR, DOC_STATUS_LABEL, DOC_STATUS_COLOR, getBillTaxBreakdown, listTaxes } from '../../../../lib/finance'
import { FinShell } from '../../FinShell'
import { BillActions } from './BillActions'
import { CopyRecordButton } from '../../../../components/CopyRecordButton'
import { getSecurityPolicy, canCopyRecordInfo } from '../../../../lib/admin'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function BillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const data = await getBill(ctx.tenant.id, id)
  if (!data) notFound()

  const { bill, lines, total } = data
  const statusColor = DOC_STATUS_COLOR[bill.status] ?? 'var(--fg-3)'
  const [breakdown, allTaxes, securityPolicy] = await Promise.all([
    getBillTaxBreakdown(ctx.tenant.id, id),
    listTaxes(ctx.tenant.id, { scope: 'purchase' }),
    getSecurityPolicy(ctx.tenant.id),
  ])
  const canCopy = canCopyRecordInfo(ctx.membership.role, securityPolicy)
  const taxById = new Map(allTaxes.map((t) => [t.id, t]))

  return (
    <FinShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeSection="bills"
    >
      <div style={{ padding: 'var(--s-6)', maxWidth: 880, display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        <div style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
          <Link href="/fin/bills" style={{ color: 'var(--fg-3)', textDecoration: 'none' }}>Tagihan Vendor</Link>
          <span style={{ margin: '0 6px' }}>›</span>
          <span>{bill.billNumber}</span>
        </div>

        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--s-3)', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0, fontFamily: 'var(--font-mono, monospace)' }}>{bill.billNumber}</h1>
            <div style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-2)', marginTop: 4 }}>
              {bill.vendorName}{bill.vendorRef ? ` · ref ${bill.vendorRef}` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {canCopy && <CopyRecordButton
              recordPath={`/fin/bills/${bill.id}`}
              fields={[
                { label: 'Tagihan', value: bill.billNumber },
                { label: 'Vendor', value: bill.vendorName },
                { label: 'Ref vendor', value: bill.vendorRef },
                { label: 'Total', value: formatIDR(breakdown.grandTotal) },
                { label: 'Tanggal', value: bill.date },
                { label: 'Jatuh tempo', value: bill.dueDate },
                { label: 'Status', value: DOC_STATUS_LABEL[bill.status] ?? bill.status },
              ]}
            />}
            <span style={{ font: '600 11px/1 var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '6px 10px', borderRadius: 999, color: statusColor, border: `1px solid ${statusColor}` }}>
              {DOC_STATUS_LABEL[bill.status] ?? bill.status}
            </span>
          </div>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-3)' }}>
          <MetaPair label="Tanggal" value={bill.date} />
          <MetaPair label="Jatuh Tempo" value={bill.dueDate} />
        </div>

        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1.4 var(--font-sans)' }}>
            <thead style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
              <tr>
                <Th>Deskripsi</Th><Th>Akun</Th><Th align="right">Qty</Th><Th align="right">Harga</Th><Th align="right">Subtotal</Th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const lineTaxNames = l.taxIds.map((id) => taxById.get(id)?.name).filter(Boolean) as string[]
                return (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <Td>
                      {l.description}
                      {bill.displayTaxInline && lineTaxNames.length > 0 && (
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
                <Td colSpan={4} align="right"><b>Total Tagihan</b></Td>
                <Td align="right" mono><b>{formatIDR(breakdown.grandTotal)}</b></Td>
              </tr>
              {breakdown.taxLines.filter((t) => t.isWithholding).map((t) => (
                <tr key={t.taxId}>
                  <Td colSpan={4} align="right" muted>{t.taxName} (potong vendor)</Td>
                  <Td align="right" mono muted>−{formatIDR(t.amount)}</Td>
                </tr>
              ))}
              {breakdown.withholdingTotal > 0 && (
                <tr style={{ background: 'var(--bg)' }}>
                  <Td colSpan={4} align="right"><b>Dibayar ke vendor (net)</b></Td>
                  <Td align="right" mono><b>{formatIDR(breakdown.netSettlement)}</b></Td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {bill.notes && (
          <div style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 'var(--r-md)', font: '13px/1.55 var(--font-sans)', color: 'var(--fg-2)' }}>{bill.notes}</div>
        )}

        <BillActions billId={bill.id} status={bill.status} journalEntryId={bill.journalEntryId} />
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
