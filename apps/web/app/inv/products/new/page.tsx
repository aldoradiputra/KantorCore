import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { listAccounts, listTaxes } from '../../../../lib/finance'
import { listCategories, listUom } from '../../../../lib/products'
import { InvShell } from '../../InvShell'
import { ProductForm } from '../ProductForm'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function NewProductPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const [allAccounts, taxes, categories, uomList] = await Promise.all([
    listAccounts(ctx.tenant.id),
    listTaxes(ctx.tenant.id, { activeOnly: true }),
    listCategories(ctx.tenant.id),
    listUom(ctx.tenant.id),
  ])

  const revenueAccounts = allAccounts.filter((a) => a.type === 'revenue' && a.isActive)
  const expenseAccounts = allAccounts.filter((a) => (a.type === 'expense' || a.type === 'asset') && a.isActive)

  return (
    <InvShell tenantName={ctx.tenant.name} userInitials={initials(session.user.name)} activeSection="products">
      <div style={{ padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        <h1 style={{ font: '600 20px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Produk Baru</h1>
        <ProductForm
          mode="create"
          revenueAccounts={revenueAccounts.map((a) => ({ id: a.id, code: a.code, name: a.name }))}
          expenseAccounts={expenseAccounts.map((a) => ({ id: a.id, code: a.code, name: a.name }))}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          uomList={uomList.map((u) => ({ id: u.id, name: u.name, symbol: u.symbol ?? null }))}
          taxes={taxes.map((t) => ({ id: t.id, name: t.name, isWithholding: t.isWithholding }))}
        />
      </div>
    </InvShell>
  )
}
