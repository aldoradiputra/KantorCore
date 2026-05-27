import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { getSecurityPolicy } from '../../../lib/admin'
import SecurityPolicyForm from './SecurityPolicyForm'

export default async function SecurityPolicyPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')
  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) redirect('/settings/profile')

  const policy = await getSecurityPolicy(ctx.tenant.id)

  return (
    <SecurityPolicyForm policy={policy} />
  )
}
