import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listSOs, type SoStatus } from '../../../lib/sales'
import { listTeams } from '../../../lib/crm-teams'
import { SalesShell } from '../SalesShell'
import OrdersPanel from './OrdersPanel'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function SalesOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: SoStatus; teamId?: string }>
}) {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const params = await searchParams
  const statusFilter = params.status ?? null
  const teamFilter   = params.teamId ?? null

  const [orders, teams] = await Promise.all([
    listSOs(ctx.tenant.id, {
      status: statusFilter ?? undefined,
      teamId: teamFilter ?? undefined,
      limit:  200,
    }),
    listTeams(ctx.tenant.id),
  ])

  return (
    <SalesShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      userEmail={session.user.email}
      activeSection={statusFilter === 'quotation' ? 'quotations' : 'orders'}
    >
      <OrdersPanel
        initialOrders={orders}
        teams={teams.map((t) => ({ id: t.id, name: t.name }))}
        initialStatus={statusFilter}
        initialTeamId={teamFilter}
      />
    </SalesShell>
  )
}
