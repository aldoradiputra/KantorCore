import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listDirectory } from '../../../lib/admin'
import DirectoryPanel from './DirectoryPanel'

export default async function DirectoryPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')
  const isAdmin = ctx.membership.role === 'owner' || ctx.membership.role === 'admin'
  if (!isAdmin) redirect('/settings/profile')

  const directory = await listDirectory(ctx.tenant.id)

  return (
    <DirectoryPanel directory={directory} />
  )
}
