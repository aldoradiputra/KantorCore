import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { getPayRun, PAY_RUN_STATUS_LABEL, PAY_RUN_STATUS_COLOR } from '../../../../lib/payroll'
import { formatIDR } from '../../../../lib/finance'
import { PayShell } from '../../PayShell'
import { PayRunActions } from './PayRunActions'
import { PayslipEditor } from './PayslipEditor'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function PayRunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const data = await getPayRun(ctx.tenant.id, id)
  if (!data) notFound()

  const { run, payslips, totalGross, totalDeductions, totalNet } = data
  const statusColor = PAY_RUN_STATUS_COLOR[run.status] ?? 'var(--fg-3)'
  const editable = run.status === 'draft' || run.status === 'calculated'

  return (
    <PayShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeSection="runs"
    >
      <div style={{ padding: 'var(--s-6)', maxWidth: 960, display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        <div style={{ font: '12px/1 var(--font-sans)', color: 'var(--fg-3)' }}>
          <Link href="/pay/runs" style={{ color: 'var(--fg-3)', textDecoration: 'none' }}>Pay Run</Link>
          <span style={{ margin: '0 6px' }}>›</span>
          <span>{run.code}</span>
        </div>

        <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--s-3)', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0, fontFamily: 'var(--font-mono, monospace)' }}>{run.code}</h1>
            <div style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-2)', marginTop: 4 }}>
              Periode {run.periodStart} — {run.periodEnd}
            </div>
            {run.description && <div style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', marginTop: 4 }}>{run.description}</div>}
          </div>
          <span style={{ font: '600 11px/1 var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '6px 10px', borderRadius: 999, color: statusColor, border: `1px solid ${statusColor}` }}>
            {PAY_RUN_STATUS_LABEL[run.status] ?? run.status}
          </span>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s-3)' }}>
          <Stat label="Total Bruto" value={formatIDR(totalGross)} />
          <Stat label="Total Potongan" value={formatIDR(totalDeductions)} />
          <Stat label="Total Bersih" value={formatIDR(totalNet)} accent />
        </div>

        {payslips.length === 0 ? (
          <div style={{ padding: '40px 24px', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface)', textAlign: 'center', font: '500 14px/1.4 var(--font-sans)', color: 'var(--fg-2)' }}>
            Belum ada payslip dalam pay run ini.
          </div>
        ) : (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>
                Payslip ({payslips.length})
              </h2>
            </div>
            {payslips.map((p) => (
              <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <PayslipEditor
                  payslipId={p.id}
                  employeeName={p.employeeName}
                  position={p.position}
                  lines={p.lines.map((l) => ({ kind: l.kind, name: l.name, amount: l.amount }))}
                  grossTotal={p.grossTotal}
                  deductionTotal={p.deductionTotal}
                  netTotal={p.netTotal}
                  editable={editable}
                />
                {!editable && (
                  <div style={{ textAlign: 'right', paddingTop: 4 }}>
                    <Link href={`/pay/payslips/${p.id}/print`} target="_blank"
                      style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--indigo)', textDecoration: 'none' }}>
                      Cetak Slip Gaji ↗
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        <PayRunActions
          payRunId={run.id}
          status={run.status}
          journalEntryId={run.journalEntryId}
          paymentJournalEntryId={run.paymentJournalEntryId}
        />
      </div>
    </PayShell>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
      <div style={{ font: '600 10px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ font: '600 16px/1.3 var(--font-mono, monospace)', color: accent ? 'var(--teal)' : 'var(--fg-1)', marginTop: 6 }}>{value}</div>
    </div>
  )
}
