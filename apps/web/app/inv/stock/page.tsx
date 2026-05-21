import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listOnHand, listLocations, seedDefaultLocations } from '../../../lib/inventory'
import { InvShell } from '../InvShell'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function StockPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  // Auto-seed locations on first visit if not present
  const locations = await listLocations(ctx.tenant.id)
  if (locations.length === 0) await seedDefaultLocations(ctx.tenant.id)

  const rows = await listOnHand(ctx.tenant.id, { internalOnly: true })

  // Group by product, summing across internal locations
  const byProduct = new Map<string, { name: string; code: string | null; qty: number; locations: { name: string; qty: number }[] }>()
  for (const r of rows) {
    const entry = byProduct.get(r.productId) ?? { name: r.productName, code: r.productCode, qty: 0, locations: [] }
    entry.qty += r.qty
    entry.locations.push({ name: r.locationName, qty: r.qty })
    byProduct.set(r.productId, entry)
  }
  const grouped = Array.from(byProduct.entries()).sort((a, b) => a[1].name.localeCompare(b[1].name))

  return (
    <InvShell tenantName={ctx.tenant.name} userInitials={initials(session.user.name)} activeSection="stock">
      <div style={{ padding: 'var(--s-6)', maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Stok Tersedia</h1>
            <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '4px 0 0' }}>
              {grouped.length} produk dengan stok di gudang internal
            </p>
          </div>
          <Link href="/inv/adjust" style={{
            padding: '8px 14px', borderRadius: 'var(--r-md)', background: 'var(--indigo)', color: 'white',
            font: '500 13px/1 var(--font-sans)', textDecoration: 'none',
          }}>
            Sesuaikan Stok
          </Link>
        </header>

        {grouped.length === 0 ? (
          <div style={{ padding: '48px 24px', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)', textAlign: 'center' }}>
            <div style={{ font: '500 14px/1.4 var(--font-sans)', color: 'var(--fg-2)' }}>Belum ada stok.</div>
            <div style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', marginTop: 4 }}>
              Gunakan Penyesuaian Stok untuk memasukkan stok awal.
            </div>
          </div>
        ) : (
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--surface)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', font: '13px/1.4 var(--font-sans)' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
                  {['Kode', 'Produk', 'Total Stok', 'Lokasi'].map((h) => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', font: '600 11px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grouped.map(([productId, p]) => (
                  <tr key={productId} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono, monospace)', fontSize: 12, color: 'var(--fg-3)' }}>{p.code ?? '—'}</td>
                    <td style={{ padding: '10px 14px', font: '500 13px/1 var(--font-sans)', color: 'var(--fg-1)' }}>{p.name}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono, monospace)', color: p.qty > 0 ? 'var(--teal)' : 'var(--red, #c33)', fontWeight: 600 }}>
                      {p.qty.toLocaleString('id-ID')}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--fg-3)', font: '12px/1.4 var(--font-sans)' }}>
                      {p.locations.map((l) => `${l.name}: ${l.qty}`).join(' · ')}
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
