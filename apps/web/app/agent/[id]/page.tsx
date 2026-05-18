import { redirect, notFound } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listAgents, getAgent, listMandates, listRuns } from '../../../lib/agent'
import { AgentShell } from '../AgentShell'
import AgentDetail from './AgentDetail'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const { id } = await params

  const [a, agentList, agentMandates, runs] = await Promise.all([
    getAgent(ctx.tenant.id, id),
    listAgents(ctx.tenant.id),
    listMandates(ctx.tenant.id, id),
    listRuns(ctx.tenant.id, id, 50),
  ])

  if (!a) notFound()

  return (
    <AgentShell
      agents={agentList}
      activeId={id}
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
    >
      <AgentDetail agent={a} mandates={agentMandates} runs={runs} />
    </AgentShell>
  )
}
