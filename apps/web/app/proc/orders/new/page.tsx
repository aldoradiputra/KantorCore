import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { listAccounts, listTaxes } from '../../../../lib/finance'
import { listContacts } from '../../../../lib/contacts'
import { listProducts } from '../../../../lib/products'
import { ProcShell } from '../../ProcShell'
import { NewPOForm } from './NewPOForm'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function NewPOPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const [accounts, taxes, contacts, products] = await Promise.all([
    listAccounts(ctx.tenant.id),
    listTaxes(ctx.tenant.id, { scope: 'purchase', activeOnly: true }),
    listContacts(ctx.tenant.id, { role: 'vendor' }),
    listProducts(ctx.tenant.id, { activeOnly: true }),
  ])

  const expenseAccounts = accounts.filter((a) => a.type === 'expense' || a.type === 'asset')

  return (
    <ProcShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeSection="orders"
    >
      <NewPOForm
        accounts={expenseAccounts.map((a) => ({ id: a.id, code: a.code, name: a.name }))}
        taxes={taxes.map((t) => ({ id: t.id, name: t.name, amount: t.amount, amountType: t.amountType }))}
        contacts={contacts.map((c) => ({
          id: c.contact.id, name: c.contact.name,
          email: c.contact.email, phone: c.contact.phone, npwp: c.contact.npwp,
          addrLine1: c.contact.addrLine1, addrLine2: c.contact.addrLine2,
          addrKelurahan: c.contact.addrKelurahan, addrKecamatan: c.contact.addrKecamatan,
          addrKota: c.contact.addrKota, addrProvinsi: c.contact.addrProvinsi, addrKodePos: c.contact.addrKodePos,
          paymentTermsLabel: c.paymentTermsLabel,
        }))}
        products={products.map((p) => ({
          id: p.product.id,
          name: p.product.name,
          code: p.product.code,
          costPrice: p.product.costPrice,
          defaultAccountId: p.product.expenseAccountId,
          defaultTaxIds: p.product.defaultPurchaseTaxIds,
          uomSymbol: p.uomSymbol,
        }))}
      />
    </ProcShell>
  )
}
