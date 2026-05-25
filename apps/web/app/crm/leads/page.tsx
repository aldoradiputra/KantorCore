import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listLeads } from '../../../lib/crm-teams'
import { listTeams } from '../../../lib/crm-teams'
import { CrmShell } from '../CrmShell'
import LeadsPanel from './LeadsPanel'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function CrmLeadsPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const [{ leads, total }, teams] = await Promise.all([
    listLeads(ctx.tenant.id, { limit: 100 }),
    listTeams(ctx.tenant.id),
  ])

  const teamOptions = teams.map((t) => ({ id: t.id, name: t.name }))

  return (
    <CrmShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      userEmail={session.user.email}
      activeSection="leads"
    >
      <LeadsPanel initialLeads={leads} total={total} teams={teamOptions} />
    </CrmShell>
  )
}
