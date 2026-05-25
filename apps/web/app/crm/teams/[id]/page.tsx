import { redirect, notFound } from 'next/navigation'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { getTeam, getTeamPerformance, listAssignmentRules } from '../../../../lib/crm-teams'
import { CrmShell } from '../../CrmShell'
import TeamDashboardClient from './TeamDashboardClient'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const { id: teamId } = await params

  const [team, performance, rules] = await Promise.all([
    getTeam(ctx.tenant.id, teamId),
    getTeamPerformance(ctx.tenant.id, teamId),
    listAssignmentRules(ctx.tenant.id, teamId),
  ])

  if (!team) notFound()

  return (
    <CrmShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      userEmail={session.user.email}
      activeSection="teams"
    >
      <TeamDashboardClient team={team} performance={performance} rules={rules} />
    </CrmShell>
  )
}
