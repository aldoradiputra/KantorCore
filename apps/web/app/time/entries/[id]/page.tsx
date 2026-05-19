import { redirect, notFound } from 'next/navigation'
import { getCurrentSession } from '../../../../lib/auth'
import { getCurrentTenant } from '../../../../lib/tenants'
import { getTimesheetEntry } from '../../../../lib/timesheet'
import { TimeShell } from '../../TimeShell'
import { EntryDetail } from './EntryDetail'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function EntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const entry = await getTimesheetEntry(ctx.tenant.id, id)
  if (!entry) notFound()

  return (
    <TimeShell
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      activeSection="entries"
    >
      <EntryDetail entry={entry} />
    </TimeShell>
  )
}
