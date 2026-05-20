import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listGroups } from '../../../lib/admin'
import { listTenantMembers } from '../../../lib/proj'
import { SettingsShell } from '../SettingsShell'
import GroupsPanel from './GroupsPanel'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function GroupsPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')
  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) redirect('/settings/profile')

  const [groups, members] = await Promise.all([
    listGroups(ctx.tenant.id),
    listTenantMembers(ctx.tenant.id),
  ])

  return (
    <SettingsShell
      activeSection="groups"
      isAdmin={isAdmin}
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      userEmail={session.user.email}
    >
      <GroupsPanel
        tenantId={ctx.tenant.id}
        groups={groups}
        members={members}
      />
    </SettingsShell>
  )
}
