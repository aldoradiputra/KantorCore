import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../lib/auth'
import { getCurrentTenant } from '../../lib/tenants'
import { listProjects } from '../../lib/proj'

export default async function ProjIndexPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const projects = await listProjects(ctx.tenant.id)
  if (projects.length > 0) redirect(`/proj/${projects[0].slug}`)
  redirect('/proj/new')
}
