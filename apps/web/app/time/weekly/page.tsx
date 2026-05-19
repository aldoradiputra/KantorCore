import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { getWeeklySummary, weekStart, weekEnd } from '../../../lib/timesheet'
import { listEmployees } from '../../../lib/hr'
import { TimeShell } from '../TimeShell'
import { WeeklySummary } from './WeeklySummary'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function WeeklyPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const today = new Date().toISOString().slice(0, 10)
  const ws = weekStart(today)
  const we = weekEnd(ws)

  const [summaryRows, employeeList] = await Promise.all([
    getWeeklySummary(ctx.tenant.id, ws, we),
    listEmployees(ctx.tenant.id),
  ])

  return (
    <TimeShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeSection="weekly"
    >
      <WeeklySummary
        initialRows={summaryRows}
        employees={employeeList}
        initialWeekStart={ws}
      />
    </TimeShell>
  )
}
