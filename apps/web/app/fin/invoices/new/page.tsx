import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { listAccounts } from '../../../../lib/finance'
import { FinShell } from '../../FinShell'
import { NewInvoiceForm } from './NewInvoiceForm'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function NewInvoicePage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const allAccounts = await listAccounts(ctx.tenant.id)
  const revenueAccounts = allAccounts.filter((a) => a.type === 'revenue' && a.isActive)

  return (
    <FinShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeSection="invoices"
    >
      <div style={{ padding: 'var(--s-6)', maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>
        <h1 style={{ font: '600 20px/1.2 var(--font-sans)', color: 'var(--fg-1)', margin: 0 }}>Faktur Baru</h1>
        <NewInvoiceForm revenueAccounts={revenueAccounts.map((a) => ({ id: a.id, code: a.code, name: a.name }))} />
      </div>
    </FinShell>
  )
}
