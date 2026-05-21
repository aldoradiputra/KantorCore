import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listMoves } from '../../../lib/inventory'
import { InvShell } from '../InvShell'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

const fmt = (d: Date) =>
  new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(d))

export default async function MovesPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const moves = await listMoves(ctx.tenant.id, { limit: 200 })

  return (
    <InvShell tenantName={ctx.tenant.name} userInitials={initials(session.user.name)} activeSection="moves">
      <div style={{ padding: 'var(--s-6)', maxWidth: 1000, display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        <div>
          <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Riwayat Pergerakan Stok</h1>
          <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '4px 0 0' }}>200 transaksi terakhir</p>
        </div>

        {moves.length === 0 ? (
          <div style={{ padding: '48px 24px', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
            <div style={{ font: '500 14px/1.4 var(--font-sans)', color: 'var(--fg-2)' }}>Belum ada pergerakan stok.</div>
          </div>
        ) : (
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1.4 var(--font-sans)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                  {['Waktu', 'Produk', 'Dari', 'Ke', 'Qty', 'Ref', 'Oleh'].map((h) => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {moves.map(({ move, productName, productCode, fromCode, toCode, createdByName }) => (
                  <tr key={move.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono, monospace)', fontSize: 11, color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>
                      {fmt(move.movedAt)}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{productName}</div>
                      {productCode && <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', marginTop: 2 }}>{productCode}</div>}
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono, monospace)', fontSize: 12, color: 'var(--fg-2)' }}>{fromCode}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono, monospace)', fontSize: 12, color: 'var(--fg-2)' }}>{toCode}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono, monospace)', fontWeight: 600, color: 'var(--fg-1)' }}>
                      {move.qty.toLocaleString('id-ID')}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--fg-3)' }}>{move.reference ?? '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--fg-3)' }}>{createdByName ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </InvShell>
  )
}
