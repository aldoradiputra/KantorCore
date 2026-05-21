import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listProducts, getProductStats } from '../../../lib/products'
import { InvShell } from '../InvShell'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

const fmtIDR = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)

const TYPE_LABEL: Record<string, string> = {
  product: 'Produk', service: 'Layanan', consumable: 'Konsumabel',
}
const TYPE_COLOR: Record<string, string> = {
  product: 'var(--indigo)', service: 'var(--teal)', consumable: 'var(--amber)',
}

export default async function ProductsPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const [rows, stats] = await Promise.all([
    listProducts(ctx.tenant.id, { activeOnly: false }),
    getProductStats(ctx.tenant.id),
  ])

  return (
    <InvShell tenantName={ctx.tenant.name} userInitials={initials(session.user.name)} activeSection="products">
      <div style={{ padding: 'var(--s-6)', maxWidth: 1000, display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--s-3)' }}>
          <div>
            <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Produk & Layanan</h1>
            <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '4px 0 0' }}>
              {stats.active} aktif · {stats.byType.product} produk · {stats.byType.service} layanan · {stats.byType.consumable} konsumabel
            </p>
          </div>
          <Link href="/inv/products/new" style={{
            padding: '8px 14px', borderRadius: 'var(--r-md)', background: 'var(--indigo)', color: 'white',
            font: '500 13px/1 var(--font-sans)', textDecoration: 'none',
          }}>
            + Produk Baru
          </Link>
        </header>

        {rows.length === 0 ? (
          <div style={{ padding: '48px 24px', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
            <div style={{ font: '500 14px/1.4 var(--font-sans)', color: 'var(--fg-2)' }}>Belum ada produk.</div>
            <div style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', marginTop: 4 }}>
              Buat produk pertama untuk mulai membuat faktur dengan item terpilih.
            </div>
          </div>
        ) : (
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1.4 var(--font-sans)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Kode</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nama</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tipe</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Kategori</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Harga Jual</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>HPP</th>
                  <th style={{ padding: '10px 14px', width: 60 }} />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ product, categoryName, uomSymbol }) => (
                  <tr key={product.id} style={{ borderBottom: '1px solid var(--border)', opacity: product.isActive ? 1 : 0.5 }}>
                    <td style={{ padding: '10px 14px', color: 'var(--fg-3)', fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }}>
                      {product.code ?? '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ font: '500 13px/1.3 var(--font-sans)', color: 'var(--fg-1)' }}>{product.name}</div>
                      {uomSymbol && <div style={{ font: '11px/1 var(--font-sans)', color: 'var(--fg-3)', marginTop: 2 }}>{uomSymbol}</div>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 8px', borderRadius: 999,
                        font: '600 10px/1 var(--font-sans)',
                        color: TYPE_COLOR[product.type],
                        border: `1px solid ${TYPE_COLOR[product.type]}`,
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>
                        {TYPE_LABEL[product.type]}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--fg-2)' }}>{categoryName ?? '—'}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--font-mono, monospace)', color: 'var(--fg-1)' }}>
                      {fmtIDR(product.salePrice)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--font-mono, monospace)', color: 'var(--fg-3)' }}>
                      {fmtIDR(product.costPrice)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                      <Link href={`/inv/products/${product.id}`} style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--indigo)', textDecoration: 'none' }}>
                        Edit
                      </Link>
                    </td>
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
