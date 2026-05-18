import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listAgents } from '../../../lib/agent'
import { AgentShell } from '../AgentShell'
import NewAgentForm from './NewAgentForm'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

export default async function NewAgentPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const agentList = await listAgents(ctx.tenant.id)

  return (
    <AgentShell
      agents={agentList}
      activeId={null}
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
    >
      <NewAgentForm />
    </AgentShell>
  )
}
