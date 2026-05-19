import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { listEmployees } from '../../../../lib/hr'
import { listProjects } from '../../../../lib/proj'
import { TimeShell } from '../../TimeShell'
import { NewEntryForm } from './NewEntryForm'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function NewEntryPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const [employeeList, projectList] = await Promise.all([
    listEmployees(ctx.tenant.id),
    listProjects(ctx.tenant.id),
  ])

  return (
    <TimeShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeSection="entries"
    >
      <NewEntryForm
        employees={employeeList}
        projects={projectList.map((p) => ({ id: p.id, slug: p.slug, name: p.name }))}
      />
    </TimeShell>
  )
}
