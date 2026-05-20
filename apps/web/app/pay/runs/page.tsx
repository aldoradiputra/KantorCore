import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listPayRuns, PAY_RUN_STATUS_LABEL, PAY_RUN_STATUS_COLOR } from '../../../lib/payroll'
import { formatIDR } from '../../../lib/finance'
import { PayShell } from '../PayShell'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function PayRunsPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const runs = await listPayRuns(ctx.tenant.id)

  return (
    <PayShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeSection="runs"
    >
      <div style={{ padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-4)', maxWidth: 1100 }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--s-4)' }}>
          <div>
            <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Pay Run</h1>
            <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '6px 0 0', maxWidth: 640 }}>
              Periode penggajian. Konfirmasi pay run mencatat jurnal akuntansi otomatis (debit Beban Gaji, kredit Utang Gaji + Potongan).
            </p>
          </div>
          <Link
            href="/pay/runs/new"
            style={{ padding: '8px 14px', borderRadius: 'var(--r-md)', background: 'var(--indigo)', color: 'white', font: '600 13px/1 var(--font-sans)', textDecoration: 'none', flexShrink: 0 }}
          >
            + Pay Run Baru
          </Link>
        </header>

        {runs.length === 0 ? (
          <div style={{ padding: '40px 24px', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface)', textAlign: 'center', font: '500 14px/1.4 var(--font-sans)', color: 'var(--fg-2)' }}>
            Belum ada pay run.
          </div>
        ) : (
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1.4 var(--font-sans)' }}>
              <thead style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                <tr>
                  <Th>Kode</Th>
                  <Th>Periode</Th>
                  <Th align="right">Payslip</Th>
                  <Th align="right">Bruto</Th>
                  <Th align="right">Bersih</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => {
                  const color = PAY_RUN_STATUS_COLOR[r.status] ?? 'var(--fg-3)'
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <Td>
                        <Link href={`/pay/runs/${r.id}`} style={{ color: 'var(--indigo)', textDecoration: 'none', fontFamily: 'var(--font-mono, monospace)' }}>
                          {r.code}
                        </Link>
                      </Td>
                      <Td>{r.periodStart} — {r.periodEnd}</Td>
                      <Td align="right">{r.payslipCount}</Td>
                      <Td align="right" mono>{formatIDR(r.grossTotal)}</Td>
                      <Td align="right" mono>{formatIDR(r.netTotal)}</Td>
                      <Td>
                        <span style={{ font: '600 10px/1 var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 7px', borderRadius: 999, color, border: `1px solid ${color}` }}>
                          {PAY_RUN_STATUS_LABEL[r.status] ?? r.status}
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
    </PayShell>
  )
}

function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return <th style={{ textAlign: align ?? 'left', padding: '10px 14px', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{children}</th>
}
function Td({ children, align, mono }: { children: React.ReactNode; align?: 'right'; mono?: boolean }) {
  return <td style={{ textAlign: align ?? 'left', padding: '12px 14px', color: 'var(--fg-1)', fontFamily: mono ? 'var(--font-mono, monospace)' : undefined }}>{children}</td>
}
