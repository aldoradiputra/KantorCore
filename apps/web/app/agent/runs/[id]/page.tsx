import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { getRun, getAgent, listAgents } from '../../../../lib/agent'
import { AgentShell } from '../../AgentShell'
import { RunDetail } from './RunDetail'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const [detail, agentList] = await Promise.all([
    getRun(ctx.tenant.id, id),
    listAgents(ctx.tenant.id),
  ])
  if (!detail) redirect('/agent/inbox')

  const agent = await getAgent(ctx.tenant.id, detail.run.agentId)

  return (
    <AgentShell
      agents={agentList}
      activeId={detail.run.agentId}
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
    >
      <RunDetail
        initialRun={detail.run}
        initialToolCalls={detail.toolCalls}
        agentName={agent?.name ?? 'Agen'}
        agentId={detail.run.agentId}
      />
    </AgentShell>
  )
}
