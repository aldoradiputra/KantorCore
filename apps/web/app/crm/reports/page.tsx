import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listTeams } from '../../../lib/crm-teams'
import { getSalespersonReport, presetPeriod, getUtmBreakdown } from '../../../lib/crm-forecast'
import { CrmShell } from '../CrmShell'
import ReportsClient from './ReportsClient'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; teamId?: string }>
}) {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const params = await searchParams
  const preset = params.preset ?? 'this_month'
  const teamId = params.teamId ?? null
  const period = presetPeriod(preset)

  const [teams, report, utmData] = await Promise.all([
    listTeams(ctx.tenant.id),
    getSalespersonReport(ctx.tenant.id, { teamId, period }),
    getUtmBreakdown(ctx.tenant.id, { teamId }),
  ])

  return (
    <CrmShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      userEmail={session.user.email}
      activeSection="reports"
    >
      <ReportsClient
        report={report}
        teams={teams.map((t) => ({ id: t.id, name: t.name }))}
        utmData={utmData}
        period={period}
        selectedTeamId={teamId}
        selectedPreset={preset}
      />
    </CrmShell>
  )
}
