import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { listDepartments } from '../../../../lib/hr'
import { HRShell } from '../../HRShell'
import { NewEmployeeForm } from './NewEmployeeForm'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function NewEmployeePage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const deptList = await listDepartments(ctx.tenant.id)

  return (
    <HRShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeSection="employees"
    >
      <NewEmployeeForm departments={deptList} />
    </HRShell>
  )
}
