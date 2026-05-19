import { redirect, notFound } from 'next/navigation'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { getEmployee, listDepartments } from '../../../../lib/hr'
import { HRShell } from '../../HRShell'
import { EmployeeDetail } from './EmployeeDetail'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const [employee, deptList] = await Promise.all([
    getEmployee(ctx.tenant.id, id),
    listDepartments(ctx.tenant.id),
  ])
  if (!employee) notFound()

  return (
    <HRShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeSection="employees"
    >
      <EmployeeDetail employee={employee} departments={deptList} />
    </HRShell>
  )
}
