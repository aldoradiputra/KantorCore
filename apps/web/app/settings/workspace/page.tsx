import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { SettingsShell } from '../SettingsShell'
import WorkspaceForm from './WorkspaceForm'

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

export default async function WorkspacePage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'

  return (
    <SettingsShell
      activeSection="workspace"
      isAdmin={isAdmin}
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
      userEmail={session.user.email}
    >
      <WorkspaceForm
        tenantId={ctx.tenant.id}
        tenantName={ctx.tenant.name}
        tenantSlug={ctx.tenant.slug}
        createdAt={String(ctx.tenant.createdAt)}
        canEdit={isAdmin}
      />
    </SettingsShell>
  )
}
