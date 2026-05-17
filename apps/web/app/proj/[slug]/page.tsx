import { notFound, redirect } from 'next/navigation'
import { getCurrentSession } from '../../../lib/auth'
import { getCurrentTenant } from '../../../lib/tenants'
import {
  listProjects,
  getProjectBySlug,
  listIssues,
  listTenantMembers,
} from '../../../lib/proj'
import { ProjShell } from '../ProjShell'
import ProjectBoard from './ProjectBoard'

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await getCurrentSession()
  if (!session) redirect('/sign-in')
  const ctx = await getCurrentTenant(session.user.id)
  if (!ctx) redirect('/sign-up')

  const [projects, project, members] = await Promise.all([
    listProjects(ctx.tenant.id),
    getProjectBySlug(ctx.tenant.id, slug),
    listTenantMembers(ctx.tenant.id),
  ])
  if (!project) notFound()

  const issues = await listIssues({ tenantId: ctx.tenant.id, projectId: project.id })

  return (
    <ProjShell
      projects={projects}
      activeSlug={project.slug}
      tenantName={ctx.tenant.name}
      userInitials={initials(session.user.name)}
    >
      <ProjectBoard
        project={project}
        currentUserId={session.user.id}
        initialIssues={issues}
        members={members}
      />
    </ProjShell>
  )
}
