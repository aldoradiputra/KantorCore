import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listMembers, listPendingInvites } from '../../../lib/settings'
import { SettingsShell } from '../SettingsShell'
import MembersPanel from './MembersPanel'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function MembersPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) redirect('/settings/profile')

  const [members, pendingInvites] = await Promise.all([
    listMembers(ctx.tenant.id),
    listPendingInvites(ctx.tenant.id),
  ])

  return (
    <SettingsShell
      activeSection="members"
      isAdmin={isAdmin}
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      userEmail={session.user.email}
    >
      <MembersPanel
        tenantId={ctx.tenant.id}
        currentUserId={session.user.id}
        members={members}
        pendingInvites={pendingInvites}
      />
    </SettingsShell>
  )
}
