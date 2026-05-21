import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listPromotions, formatIDR } from '../../../lib/promotions'
import type { Promotion } from '../../../lib/promotions'

const STATUS_LABEL: Record<string, string> = {
  active:   'Aktif',
  inactive: 'Nonaktif',
  archived: 'Diarsipkan',
}

const STATUS_COLOR: Record<string, string> = {
  active:   'var(--success)',
  inactive: 'var(--fg-3)',
  archived: 'var(--fg-3)',
}

const DISCOUNT_LABEL: Record<string, string> = {
  percentage:   'Persentase',
  fixed_amount: 'Nominal Tetap',
  tiered:       'Bertingkat',
  bogo:         'Beli-Gratis',
  bundle:       'Bundle',
}

function discountSummary(p: Promotion): string {
  const cfg = (p.discountConfig ?? {}) as Record<string, unknown>
  switch (p.discountType) {
    case 'percentage':   return `${cfg.percent ?? 0}%`
    case 'fixed_amount': return formatIDR(Number(cfg.amount ?? 0))
    case 'tiered':       return 'Bertingkat'
    case 'bogo':         return `Beli ${cfg.buy_qty ?? 1} Gratis ${cfg.get_qty ?? 1}`
    case 'bundle':       return `Bundle ${formatIDR(Number(cfg.bundle_price ?? 0))}`
    default:             return '-'
  }
}

export default async function PromotionsPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const promos = await listPromotions(ctx.tenant.id)
  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'

  return (
    <div style={{ padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ font: '600 20px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Promosi</h1>
          <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '4px 0 0' }}>
            Aturan diskon otomatis pada pesanan penjualan.
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/promo/promotions/new"
            style={{
              height: 36, padding: '0 var(--s-4)', background: 'var(--indigo)',
              color: 'var(--white)', border: 'none', borderRadius: 'var(--r-sm)',
              font: '600 13px/36px var(--font-sans)', cursor: 'pointer', textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            + Buat Promosi
          </Link>
        )}
      </div>

      {promos.length === 0 ? (
        <div style={{
          padding: 'var(--s-8)',
          textAlign: 'center',
          font: '13px/1.5 var(--font-sans)',
          color: 'var(--fg-3)',
          border: '1px dashed var(--border)',
          borderRadius: 'var(--r-md)',
        }}>
          Belum ada promosi. Buat yang pertama.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1 var(--font-sans)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Nama', 'Tipe Diskon', 'Nilai', 'Berlaku', 'Prioritas', 'Status', ''].map((h) => (
                <th key={h} style={{ padding: 'var(--s-2) var(--s-3)', textAlign: 'left', font: '500 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {promos.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: 'var(--s-3)', color: 'var(--fg-1)', fontWeight: 500 }}>
                  {p.name}
                  {p.description && (
                    <div style={{ font: '12px/1.4 var(--font-sans)', color: 'var(--fg-3)', marginTop: 2 }}>
                      {p.description.slice(0, 60)}{p.description.length > 60 ? '…' : ''}
                    </div>
                  )}
                </td>
                <td style={{ padding: 'var(--s-3)', color: 'var(--fg-2)' }}>
                  {DISCOUNT_LABEL[p.discountType] ?? p.discountType}
                </td>
                <td style={{ padding: 'var(--s-3)', color: 'var(--fg-1)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {discountSummary(p)}
                </td>
                <td style={{ padding: 'var(--s-3)', color: 'var(--fg-3)', fontSize: 12 }}>
                  {p.validFrom ?? '—'} → {p.validTo ?? '∞'}
                </td>
                <td style={{ padding: 'var(--s-3)', color: 'var(--fg-3)', textAlign: 'center' }}>
                  {p.priority}
                </td>
                <td style={{ padding: 'var(--s-3)' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
                    background: p.status === 'active' ? 'var(--teal-light)' : 'var(--bg)',
                    color: STATUS_COLOR[p.status] ?? 'var(--fg-3)',
                  }}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </td>
                <td style={{ padding: 'var(--s-3)' }}>
                  {isAdmin && (
                    <ToggleStatusButton id={p.id} current={p.status} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// Minimal inline toggle — client island kept simple
function ToggleStatusButton({ id, current }: { id: string; current: string }) {
  // Rendered server-side, client interaction via form action pattern
  return (
    <Link
      href={`/promo/promotions/${id}/edit`}
      style={{ font: '12px/1 var(--font-sans)', color: 'var(--indigo)', textDecoration: 'none' }}
    >
      Edit
    </Link>
  )
}
