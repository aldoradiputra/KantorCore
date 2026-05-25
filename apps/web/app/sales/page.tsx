import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentSession } from '../../lib/auth'
import { getCurrentTenant } from '../../lib/tenants'
import {
  getStatusSummary, getRevenueTrend, getTopCustomers,
  getSalesKpis, getSalespersonBreakdown,
} from '../../lib/sales-dashboard'
import { listTeams } from '../../lib/crm-teams'
import { SalesShell } from './SalesShell'
import SalesDashboardClient from './SalesDashboardClient'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function SalesDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ teamId?: string }>
}) {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const params = await searchParams
  const teamId = params.teamId ?? null

  const [teams, kpis, statusSummary, trend, topCustomers, salespeople] = await Promise.all([
    listTeams(ctx.tenant.id),
    getSalesKpis(ctx.tenant.id, { teamId }),
    getStatusSummary(ctx.tenant.id, { teamId }),
    getRevenueTrend(ctx.tenant.id, { teamId, weeks: 12 }),
    getTopCustomers(ctx.tenant.id, { teamId, limit: 8 }),
    getSalespersonBreakdown(ctx.tenant.id, { teamId }),
  ])

  return (
    <SalesShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      userEmail={session.user.email}
      activeSection="dashboard"
    >
      <SalesDashboardClient
        teams={teams.map((t) => ({ id: t.id, name: t.name }))}
        selectedTeamId={teamId}
        kpis={kpis}
        statusSummary={statusSummary}
        trend={trend}
        topCustomers={topCustomers}
        salespeople={salespeople}
      />
    </SalesShell>
  )
}
