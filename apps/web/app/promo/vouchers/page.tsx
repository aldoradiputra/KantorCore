import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listVouchers } from '../../../lib/promotions'
import VoucherActions from './VoucherActions'

export default async function VouchersPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const vouchers = await listVouchers(ctx.tenant.id, { type: 'code' })
  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'

  return (
    <div style={{ padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ font: '600 20px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Voucher</h1>
          <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '4px 0 0' }}>
            Kode voucher sekali pakai atau terbatas untuk diskon.
          </p>
        </div>
        {isAdmin && <VoucherActions />}
      </div>

      {vouchers.length === 0 ? (
        <div style={{ padding: 'var(--s-8)', textAlign: 'center', font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)' }}>
          Belum ada voucher.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1 var(--font-sans)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Kode', 'Diskon', 'Terpakai / Maks', 'Berlaku Hingga', 'Status'].map((h) => (
                <th key={h} style={{ padding: 'var(--s-2) var(--s-3)', textAlign: 'left', font: '500 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vouchers.map((v) => {
              const today = new Date().toISOString().slice(0, 10)
              const expired = v.validTo ? v.validTo < today : false
              const exhausted = v.maxUses !== null && v.usageCount >= (v.maxUses ?? 0)
              const statusLabel = expired ? 'Kadaluarsa' : exhausted ? 'Habis' : 'Aktif'
              const statusColor = expired || exhausted ? 'var(--fg-3)' : 'var(--success)'

              const discountText = v.discountOverrideAmt
                ? `Rp ${(v.discountOverrideAmt / 100).toLocaleString('id-ID')}`
                : v.discountOverridePct
                ? `${v.discountOverridePct}%`
                : 'Dari promosi'

              return (
                <tr key={v.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 'var(--s-3)', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', letterSpacing: '0.05em' }}>
                    {v.code}
                  </td>
                  <td style={{ padding: 'var(--s-3)', color: 'var(--fg-2)' }}>{discountText}</td>
                  <td style={{ padding: 'var(--s-3)', color: 'var(--fg-2)' }}>
                    {v.usageCount} / {v.maxUses ?? '∞'}
                  </td>
                  <td style={{ padding: 'var(--s-3)', color: 'var(--fg-3)', fontSize: 12 }}>
                    {v.validTo ?? '—'}
                  </td>
                  <td style={{ padding: 'var(--s-3)' }}>
                    <span style={{ font: '600 11px/1 var(--font-sans)', color: statusColor }}>
                      {statusLabel}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
