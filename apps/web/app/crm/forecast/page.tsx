import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listTeams } from '../../../lib/crm-teams'
import { getForecast, presetPeriod } from '../../../lib/crm-forecast'
import { CrmShell } from '../CrmShell'
import ForecastClient from './ForecastClient'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function ForecastPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; teamId?: string; start?: string; end?: string }>
}) {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const params = await searchParams
  const preset = params.preset ?? 'this_month'
  const teamId = params.teamId ?? null
  const period = params.start && params.end
    ? { start: new Date(params.start), end: new Date(params.end), label: 'Custom' }
    : presetPeriod(preset)

  const [teams, forecast] = await Promise.all([
    listTeams(ctx.tenant.id),
    getForecast(ctx.tenant.id, { teamId, period }),
  ])

  return (
    <CrmShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      userEmail={session.user.email}
      activeSection="forecast"
    >
      <ForecastClient
        forecast={forecast}
        teams={teams.map((t) => ({ id: t.id, name: t.name }))}
        selectedTeamId={teamId}
        selectedPreset={preset}
      />
    </CrmShell>
  )
}
