import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { listAccounts, listTaxes } from '../../../../lib/finance'
import { listContacts } from '../../../../lib/contacts'
import { listProducts } from '../../../../lib/products'
import { FinShell } from '../../FinShell'
import { NewBillForm } from './NewBillForm'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function NewBillPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const [allAccounts, taxes, contactRows, productRows] = await Promise.all([
    listAccounts(ctx.tenant.id),
    listTaxes(ctx.tenant.id, { scope: 'purchase', activeOnly: true }),
    listContacts(ctx.tenant.id, { role: 'vendor' }),
    listProducts(ctx.tenant.id, { activeOnly: true }),
  ])
  const expenseAccounts = allAccounts.filter((a) => (a.type === 'expense' || a.type === 'asset') && a.isActive)

  return (
    <FinShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeSection="bills"
    >
      <div style={{ padding: 'var(--s-6)', maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        <h1 style={{ font: '600 20px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Tagihan Baru</h1>
        <NewBillForm
          expenseAccounts={expenseAccounts.map((a) => ({ id: a.id, code: a.code, name: a.name }))}
          taxes={taxes.map((t) => ({ id: t.id, name: t.name, amount: t.amount, amountType: t.amountType, isWithholding: t.isWithholding }))}
          contacts={contactRows.map((r) => ({ id: r.contact.id, name: r.contact.name, email: r.contact.email, phone: r.contact.phone }))}
          products={productRows.map((r) => ({
            id: r.product.id,
            name: r.product.name,
            code: r.product.code,
            costPrice: r.product.costPrice,
            defaultAccountId: r.product.expenseAccountId,
            defaultTaxIds: r.product.defaultPurchaseTaxIds,
            uomSymbol: r.uomSymbol,
          }))}
        />
      </div>
    </FinShell>
  )
}
