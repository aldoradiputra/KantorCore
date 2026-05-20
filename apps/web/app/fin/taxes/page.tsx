import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listTaxes, listTaxGroups } from '../../../lib/finance'
import { FinShell } from '../FinShell'
import { TaxesSeedButton } from './SeedButton'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

function formatAmount(amountType: string, amount: number): string {
  if (amountType === 'percent') return `${(amount / 100).toFixed(2)}%`
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
}

const SCOPE_LABEL: Record<string, string> = { sale: 'Penjualan', purchase: 'Pembelian' }

export default async function TaxesPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const [taxes, groups] = await Promise.all([
    listTaxes(ctx.tenant.id),
    listTaxGroups(ctx.tenant.id),
  ])

  return (
    <FinShell tenantName={ctx.tenant.name} userInitials={initials(session.user.name)} activeSection="taxes">
      <div style={{ padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-4)', maxWidth: 1100 }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--s-3)' }}>
          <div>
            <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Pajak</h1>
            <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '6px 0 0', maxWidth: 640 }}>
              Pajak dikonfigurasi per ruang lingkup (penjualan/pembelian), terhubung ke akun di Bagan Akun. Saat faktur dikonfirmasi, baris jurnal pajak otomatis terbentuk.
            </p>
          </div>
          {taxes.length === 0 && <TaxesSeedButton />}
        </header>

        {taxes.length === 0 ? (
          <div style={{ padding: '40px 24px', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)', background: 'var(--surface)', textAlign: 'center' }}>
            <div style={{ font: '500 14px/1.4 var(--font-sans)', color: 'var(--fg-2)' }}>Belum ada pajak.</div>
            <div style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', marginTop: 4 }}>
              Klik tombol di atas untuk memuat pajak standar Indonesia (PPN 11%).
            </div>
          </div>
        ) : (
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1.4 var(--font-sans)' }}>
              <thead>
                <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nama</th>
                  <th style={{ padding: '10px 14px', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ruang Lingkup</th>
                  <th style={{ padding: '10px 14px', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tarif</th>
                  <th style={{ padding: '10px 14px', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Grup</th>
                  <th style={{ padding: '10px 14px', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Akun</th>
                  <th style={{ padding: '10px 14px', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tampilan</th>
                </tr>
              </thead>
              <tbody>
                {taxes.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px', color: 'var(--fg-1)', font: '500 13px/1.3 var(--font-sans)' }}>
                      {t.name}
                      {t.isWithholding && (
                        <span style={{ marginLeft: 8, font: '600 10px/1 var(--font-sans)', color: 'var(--amber)', border: '1px solid var(--amber)', padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Withholding
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--fg-2)' }}>{SCOPE_LABEL[t.scope] ?? t.scope}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono, monospace)', color: 'var(--fg-1)' }}>{formatAmount(t.amountType, t.amount)}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--fg-2)' }}>{t.groupName ?? '—'}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--fg-2)', fontFamily: 'var(--font-mono, monospace)' }}>{t.accountCode} {t.accountName}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--fg-3)' }}>{t.priceInclude ? 'Termasuk harga' : 'Eksklusif'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {groups.length > 0 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)' }}>
            <h2 style={{ font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Grup Pajak</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {groups.map((g) => (
                <span key={g.id} style={{ padding: '6px 12px', borderRadius: 999, background: 'var(--bg)', border: '1px solid var(--border)', font: '12px/1 var(--font-sans)', color: 'var(--fg-2)' }}>
                  {g.name}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </FinShell>
  )
}
