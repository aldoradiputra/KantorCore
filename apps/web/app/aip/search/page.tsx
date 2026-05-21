import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { AipShell } from '../AipShell'
import { AiSearch } from './AiSearch'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function AipSearchPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  return (
    <AipShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeSection="search"
    >
      <AiSearch tenantName={ctx.tenant.name} />
    </AipShell>
  )
}
