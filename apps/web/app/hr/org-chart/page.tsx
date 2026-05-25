import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listDepartments, listEmployees } from '../../../lib/hr'
import { HRShell } from '../HRShell'
import { OrgChart } from './OrgChart'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function OrgChartPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const [depts, emps] = await Promise.all([
    listDepartments(ctx.tenant.id),
    listEmployees(ctx.tenant.id, { status: 'active' }),
  ])

  return (
    <HRShell tenantName={ctx.tenant.name} userInitials={initials(session.user.name)} activeSection="org-chart">
      <OrgChart departments={depts} employees={emps} />
    </HRShell>
  )
}
