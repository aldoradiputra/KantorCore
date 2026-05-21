import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { TrigShell } from '../../TrigShell'
import NewRuleForm from './NewRuleForm'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function NewRulePage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  return (
    <TrigShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeSection="rules"
    >
      <NewRuleForm />
    </TrigShell>
  )
}
