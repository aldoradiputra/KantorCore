import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listVouchers, formatIDR } from '../../../lib/promotions'
import IssueGiftCardButton from './IssueGiftCardButton'

export default async function GiftCardsPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const cards = await listVouchers(ctx.tenant.id, { type: 'gift_card' })
  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'

  return (
    <div style={{ padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ font: '600 20px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Gift Card</h1>
          <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '4px 0 0' }}>
            Kredit prabayar yang diterbitkan untuk pelanggan.
          </p>
        </div>
        {isAdmin && <IssueGiftCardButton />}
      </div>

      {cards.length === 0 ? (
        <div style={{ padding: 'var(--s-8)', textAlign: 'center', font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)' }}>
          Belum ada gift card.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1 var(--font-sans)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Kode', 'Nilai Awal', 'Saldo', 'Berlaku Hingga', 'Catatan'].map((h) => (
                <th key={h} style={{ padding: 'var(--s-2) var(--s-3)', textAlign: 'left', font: '500 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cards.map((c) => {
              const today = new Date().toISOString().slice(0, 10)
              const expired = c.validTo ? c.validTo < today : false
              const empty = (c.balance ?? 0) <= 0

              return (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', opacity: (expired || empty) ? 0.6 : 1 }}>
                  <td style={{ padding: 'var(--s-3)', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', letterSpacing: '0.05em' }}>
                    {c.code}
                  </td>
                  <td style={{ padding: 'var(--s-3)', color: 'var(--fg-2)' }}>
                    {c.initialBalance != null ? formatIDR(c.initialBalance) : '—'}
                  </td>
                  <td style={{ padding: 'var(--s-3)', fontWeight: 600, color: (c.balance ?? 0) > 0 ? 'var(--success)' : 'var(--fg-3)' }}>
                    {c.balance != null ? formatIDR(c.balance) : '—'}
                  </td>
                  <td style={{ padding: 'var(--s-3)', color: expired ? 'var(--danger)' : 'var(--fg-3)', fontSize: 12 }}>
                    {c.validTo ?? '—'}
                  </td>
                  <td style={{ padding: 'var(--s-3)', color: 'var(--fg-3)', fontSize: 12 }}>
                    {c.notes ?? '—'}
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
