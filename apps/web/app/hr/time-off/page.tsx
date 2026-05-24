import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listEmployees } from '../../../lib/hr'
import { HRShell } from '../HRShell'
import { TimeOffPanel } from './TimeOffPanel'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function TimeOffPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const employeeList = await listEmployees(ctx.tenant.id)
  const employees = employeeList.map(e => ({ id: e.id, name: e.name }))

  return (
    <HRShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      userEmail={session.user.email}
      activeSection="time-off"
    >
      <TimeOffPanel employees={employees} />
    </HRShell>
  )
}
