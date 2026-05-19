import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listTimesheetEntries } from '../../../lib/timesheet'
import { listEmployees } from '../../../lib/hr'
import { TimeShell } from '../TimeShell'
import { EntryList } from './EntryList'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function EntriesPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const [entries, employeeList] = await Promise.all([
    listTimesheetEntries(ctx.tenant.id),
    listEmployees(ctx.tenant.id),
  ])

  return (
    <TimeShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeSection="entries"
    >
      <EntryList
        initialEntries={entries}
        employees={employeeList}
      />
    </TimeShell>
  )
}
