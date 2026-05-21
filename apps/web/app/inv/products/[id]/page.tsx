import { notFound, redirect } from 'next/navigation'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { listAccounts, listTaxes } from '../../../../lib/finance'
import { getProduct, listCategories, listUom } from '../../../../lib/products'
import { InvShell } from '../../InvShell'
import { ProductForm } from '../ProductForm'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const { id } = await params

  const [row, allAccounts, taxes, categories, uomList] = await Promise.all([
    getProduct(ctx.tenant.id, id),
    listAccounts(ctx.tenant.id),
    listTaxes(ctx.tenant.id, { activeOnly: true }),
    listCategories(ctx.tenant.id),
    listUom(ctx.tenant.id),
  ])

  if (!row) notFound()

  const { product } = row
  const revenueAccounts = allAccounts.filter((a) => a.type === 'revenue' && a.isActive)
  const expenseAccounts = allAccounts.filter((a) => (a.type === 'expense' || a.type === 'asset') && a.isActive)

  return (
    <InvShell tenantName={ctx.tenant.name} userInitials={initials(session.user.name)} activeSection="products">
      <div style={{ padding: 'var(--s-6)', display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        <div>
          <h1 style={{ font: '600 20px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>{product.name}</h1>
          {!product.isActive && (
            <span style={{ display: 'inline-block', marginTop: 6, padding: '3px 8px', borderRadius: 4, background: 'var(--bg)', border: '1px solid var(--border)', font: '600 10px/1 var(--font-sans)', color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Diarsipkan
            </span>
          )}
        </div>
        <ProductForm
          mode="edit"
          productId={product.id}
          initial={{
            code: product.code ?? undefined,
            name: product.name,
            description: product.description ?? undefined,
            type: product.type,
            categoryId: product.categoryId ?? undefined,
            uomId: product.uomId ?? undefined,
            salePrice: product.salePrice,
            costPrice: product.costPrice,
            revenueAccountId: product.revenueAccountId ?? undefined,
            expenseAccountId: product.expenseAccountId ?? undefined,
            defaultSaleTaxIds: product.defaultSaleTaxIds,
            defaultPurchaseTaxIds: product.defaultPurchaseTaxIds,
            notes: product.notes ?? undefined,
            isActive: product.isActive,
          }}
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
