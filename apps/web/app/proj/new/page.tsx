import { redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import { listProjects } from '../../../lib/proj'
import { ProjShell } from '../ProjShell'
import NewProjectForm from './NewProjectForm'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

export default async function NewProjectPage() {
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const projects = await listProjects(ctx.tenant.id)
  return (
    <ProjShell
      projects={projects}
      activeSlug={null}
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
    >
      <NewProjectForm />
    </ProjShell>
  )
}
