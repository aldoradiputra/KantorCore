import 'server-only'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { getCurrentSession } from '../../../../../lib/auth'
import { getCurrentTenant } from '../../../../../lib/tenants'
import { getDb } from '../../../../../lib/db'
import { payslips, payslipLines, payRuns } from '@kantorcore/db'
import { eq, and, asc } from 'drizzle-orm'
import type { PayslipLine } from '@kantorcore/db'
import { PrintButton } from './PrintButton'

export const metadata: Metadata = {
  title: 'Slip Gaji — KantorCore',
}

function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)
}

function formatPeriod(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', timeZone: 'UTC' })
}

const printStyles = `
  *, *::before, *::after { box-sizing: border-box; }

  body {
    font-family: system-ui, -apple-system, sans-serif;
    background: #f5f5f5;
    margin: 0;
    padding: 0;
    color: #111;
  }

  .no-print-bar {
    background: #1A2B5A;
    color: white;
    padding: 10px 24px;
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 13px;
  }

  .no-print-bar a {
    color: rgba(255,255,255,0.75);
    text-decoration: none;
  }

  .no-print-bar a:hover {
    color: white;
  }

  .page-wrap {
    padding: 32px 24px 48px;
    display: flex;
    justify-content: center;
  }

  .slip {
    background: white;
    width: 100%;
    max-width: 720px;
    border: 1px solid #ccc;
    border-radius: 4px;
    overflow: hidden;
  }

  .slip-header {
    padding: 20px 28px;
    border-bottom: 2px solid #1A2B5A;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .company-name {
    font-size: 18px;
    font-weight: 700;
    color: #1A2B5A;
    margin: 0 0 2px;
  }

  .slip-title {
    font-size: 20px;
    font-weight: 700;
    color: #1A2B5A;
    letter-spacing: 0.08em;
    text-align: right;
    margin: 0 0 2px;
  }

  .slip-period {
    font-size: 12px;
    color: #555;
    text-align: right;
  }

  .slip-meta {
    border-bottom: 1px solid #ddd;
  }

  .meta-row {
    display: grid;
    grid-template-columns: 180px 1fr;
    border-bottom: 1px solid #eee;
  }

  .meta-row:last-child {
    border-bottom: none;
  }

  .meta-label {
    padding: 8px 16px 8px 28px;
    font-size: 12px;
    color: #555;
    background: #f9f9f9;
    border-right: 1px solid #eee;
  }

  .meta-value {
    padding: 8px 28px 8px 16px;
    font-size: 13px;
    font-weight: 500;
    color: #111;
  }

  .section-header {
    display: grid;
    grid-template-columns: 1fr auto;
    padding: 8px 28px;
    background: #f0f3fa;
    border-top: 1px solid #ddd;
    border-bottom: 1px solid #ddd;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: #1A2B5A;
  }

  .line-row {
    display: grid;
    grid-template-columns: 1fr auto;
    padding: 7px 28px;
    border-bottom: 1px solid #f0f0f0;
    font-size: 13px;
  }

  .line-row:last-child {
    border-bottom: none;
  }

  .line-name {
    color: #222;
  }

  .line-amount {
    font-variant-numeric: tabular-nums;
    text-align: right;
    color: #111;
  }

  .subtotal-row {
    display: grid;
    grid-template-columns: 1fr auto;
    padding: 9px 28px;
    border-top: 1.5px solid #999;
    font-size: 13px;
    font-weight: 600;
    background: #f9f9f9;
  }

  .subtotal-label {
    color: #333;
  }

  .subtotal-amount {
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  .net-row {
    display: grid;
    grid-template-columns: 1fr auto;
    padding: 14px 28px;
    border-top: 2px solid #1A2B5A;
    background: #1A2B5A;
    font-size: 15px;
    font-weight: 700;
    color: white;
  }

  .net-amount {
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  .slip-footer {
    padding: 14px 28px;
    border-top: 1px solid #eee;
    font-size: 11px;
    color: #888;
    text-align: center;
  }

  @media print {
    @page { margin: 1cm; }

    body { background: white; }

    .no-print-bar { display: none; }

    .page-wrap { padding: 0; }

    .slip {
      border: none;
      border-radius: 0;
      max-width: 100%;
    }
  }
`

export default async function PayslipPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')

  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const db = getDb()

  const [slip] = await db
    .select({ payslip: payslips, run: payRuns })
    .from(payslips)
    .innerJoin(payRuns, eq(payslips.payRunId, payRuns.id))
    .where(and(eq(payslips.id, id), eq(payslips.tenantId, ctx.tenant.id)))
    .limit(1)

  if (!slip) notFound()

  const lines: PayslipLine[] = await db
    .select()
    .from(payslipLines)
    .where(eq(payslipLines.payslipId, id))
    .orderBy(asc(payslipLines.kind), asc(payslipLines.createdAt))

  const earnings = lines.filter((l) => l.kind === 'earning')
  const deductions = lines.filter((l) => l.kind === 'deduction')

  const { payslip, run } = slip

  const periodLabel = formatPeriod(run.periodStart)
  const payslipCode = `${run.code}-${payslip.employeeName.replace(/\s+/g, '').slice(0, 4).toUpperCase()}`

  return (
    <html lang="id">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Slip Gaji — {payslip.employeeName} — {periodLabel}</title>
        <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      </head>
      <body>
        {/* Top bar — hidden on print */}
        <div className="no-print-bar">
          <Link href={`/pay/runs/${run.id}`}>&#8592; Kembali ke {run.code}</Link>
          <span style={{ flex: 1 }} />
          <PrintButton />
        </div>

        <div className="page-wrap">
          <div className="slip">
            {/* Header */}
            <div className="slip-header">
              <div>
                <p className="company-name">{ctx.tenant.name}</p>
              </div>
              <div>
                <p className="slip-title">SLIP GAJI</p>
                <p className="slip-period">Periode: {periodLabel}</p>
              </div>
            </div>

            {/* Employee meta */}
            <div className="slip-meta">
              <div className="meta-row">
                <span className="meta-label">Nama Karyawan</span>
                <span className="meta-value">{payslip.employeeName}</span>
              </div>
              {payslip.position && (
                <div className="meta-row">
                  <span className="meta-label">Jabatan</span>
                  <span className="meta-value">{payslip.position}</span>
                </div>
              )}
              <div className="meta-row">
                <span className="meta-label">No. Payslip</span>
                <span className="meta-value" style={{ fontFamily: 'monospace', fontSize: 12 }}>{payslipCode}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Pay Run</span>
                <span className="meta-value" style={{ fontFamily: 'monospace', fontSize: 12 }}>{run.code}</span>
              </div>
            </div>

            {/* Earnings */}
            <div className="section-header">
              <span>Penghasilan</span>
              <span>Jumlah (Rp)</span>
            </div>
            {earnings.length > 0 ? (
              earnings.map((line) => (
                <div key={line.id} className="line-row">
                  <span className="line-name">{line.name}</span>
                  <span className="line-amount">{formatIDR(line.amount)}</span>
                </div>
              ))
            ) : (
              <div className="line-row">
                <span className="line-name" style={{ color: '#999', fontStyle: 'italic' }}>Tidak ada komponen penghasilan</span>
                <span className="line-amount">0,00</span>
              </div>
            )}
            <div className="subtotal-row">
              <span className="subtotal-label">Total Penghasilan (Bruto)</span>
              <span className="subtotal-amount">{formatIDR(payslip.grossTotal)}</span>
            </div>

            {/* Deductions */}
            <div className="section-header" style={{ marginTop: 0 }}>
              <span>Potongan</span>
              <span>Jumlah (Rp)</span>
            </div>
            {deductions.length > 0 ? (
              deductions.map((line) => (
                <div key={line.id} className="line-row">
                  <span className="line-name">{line.name}</span>
                  <span className="line-amount">{formatIDR(line.amount)}</span>
                </div>
              ))
            ) : (
              <div className="line-row">
                <span className="line-name" style={{ color: '#999', fontStyle: 'italic' }}>Tidak ada potongan</span>
                <span className="line-amount">0,00</span>
              </div>
            )}
            <div className="subtotal-row">
              <span className="subtotal-label">Total Potongan</span>
              <span className="subtotal-amount">{formatIDR(payslip.deductionTotal)}</span>
            </div>

            {/* Net pay */}
            <div className="net-row">
              <span>Gaji Bersih (THP)</span>
              <span className="net-amount">{formatIDR(payslip.netTotal)}</span>
            </div>

            {/* Footer */}
            <div className="slip-footer">
              Dokumen ini dicetak secara otomatis oleh sistem KantorCore pada{' '}
              {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.
              Slip gaji ini sah tanpa tanda tangan.
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
