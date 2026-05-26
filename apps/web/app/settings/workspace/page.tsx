import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import WorkspaceForm from './WorkspaceForm'

export default async function WorkspacePage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'

  return (
    <WorkspaceForm
      tenantId={ctx.tenant.id}
      tenantName={ctx.tenant.name}
      tenantSlug={ctx.tenant.slug}
      createdAt={String(ctx.tenant.createdAt)}
      canEdit={isAdmin}
    />
  )
}
