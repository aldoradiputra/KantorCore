import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listRentCustomers } from '../../../lib/rent'
import { RentShell } from '../RentShell'
import { CustomerList } from './CustomerList'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function CustomersPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const list = await listRentCustomers(ctx.tenant.id)

  return (
    <RentShell tenantName={ctx.tenant.name} userInitials={initials(session.user.name)} activeSection="customers">
      <CustomerList initialCustomers={list} />
    </RentShell>
  )
}
