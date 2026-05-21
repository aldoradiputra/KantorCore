import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listProducts } from '../../../lib/products'
import { listLocations } from '../../../lib/inventory'
import { InvShell } from '../InvShell'
import { AdjustForm } from './AdjustForm'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function AdjustPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const [productRows, locations] = await Promise.all([
    listProducts(ctx.tenant.id, { activeOnly: true }),
    listLocations(ctx.tenant.id),
  ])

  const internalLocations = locations.filter((l) => l.type === 'internal')

  return (
    <InvShell tenantName={ctx.tenant.name} userInitials={initials(session.user.name)} activeSection="adjust">
      <div style={{ padding: 'var(--s-6)', maxWidth: 600, display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        <div>
          <h1 style={{ font: '600 22px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Penyesuaian Stok</h1>
          <p style={{ font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)', margin: '4px 0 0' }}>
            Tetapkan jumlah stok aktual di lokasi tertentu. Perbedaan dicatat sebagai pergerakan dari/ke lokasi virtual Penyesuaian.
          </p>
        </div>
        {internalLocations.length === 0 ? (
          <div style={{ padding: '24px', border: '1px dashed var(--border)', borderRadius: 'var(--r-md)', textAlign: 'center', font: '13px/1.5 var(--font-sans)', color: 'var(--fg-3)' }}>
            Lokasi gudang belum ada. Kunjungi halaman Stok Tersedia terlebih dahulu untuk memuat lokasi default.
          </div>
        ) : (
          <AdjustForm
            products={productRows.map((r) => ({ id: r.product.id, name: r.product.name, code: r.product.code, uomSymbol: r.uomSymbol }))}
            locations={internalLocations.map((l) => ({ id: l.id, code: l.code, name: l.name }))}
          />
        )}
      </div>
    </InvShell>
  )
}
