import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listEmployees, listDepartments } from '../../../lib/hr'
import { HRShell } from '../HRShell'
import { EmployeeList } from './EmployeeList'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function EmployeesPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const [employeeList, deptList] = await Promise.all([
    listEmployees(ctx.tenant.id),
    listDepartments(ctx.tenant.id),
  ])

  return (
    <HRShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeSection="employees"
    >
      <EmployeeList initialEmployees={employeeList} departments={deptList} />
    </HRShell>
  )
}
