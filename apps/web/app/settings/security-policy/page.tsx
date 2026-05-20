import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { getSecurityPolicy } from '../../../lib/admin'
import { SettingsShell } from '../SettingsShell'
import SecurityPolicyForm from './SecurityPolicyForm'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function SecurityPolicyPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')
  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) redirect('/settings/profile')

  const policy = await getSecurityPolicy(ctx.tenant.id)

  return (
    <SettingsShell
      activeSection="security-policy"
      isAdmin={isAdmin}
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      userEmail={session.user.email}
    >
      <SecurityPolicyForm policy={policy} />
    </SettingsShell>
  )
}
