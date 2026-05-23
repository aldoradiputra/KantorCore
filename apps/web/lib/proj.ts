import 'server-only'
import { and, asc, desc, eq, sql } from 'drizzle-orm'
import {
  projects,
  issues,
  users,
  memberships,
  type Project,
  type Issue,
  type IssueStatus,
  type IssuePriority,
} from '@kantorcore/db'
import { withTenant } from './db'

const SLUG_RE = /^[a-z0-9]([a-z0-9-]{1,62}[a-z0-9])?$/
const KEY_RE = /^[A-Z][A-Z0-9]{1,7}$/

export function validateProjectSlug(slug: string): string | null {
  if (!slug) return 'Slug proyek wajib diisi.'
  if (slug.length < 2) return 'Slug minimal 2 karakter.'
  if (slug.length > 64) return 'Slug maksimal 64 karakter.'
  if (!SLUG_RE.test(slug)) return 'Slug hanya boleh huruf kecil, angka, dan tanda hubung.'
  return null
}

export function validateProjectKey(key: string): string | null {
  if (!key) return 'Kode proyek wajib diisi.'
  if (!KEY_RE.test(key)) {
    return 'Kode harus 2–8 karakter, huruf kapital dan angka (contoh: KAN, OPS, ENG2).'
  }
  return null
}

export async function listProjects(tenantId: string): Promise<Project[]> {
  return withTenant(tenantId, (tx) =>
    tx
      .select()
      .from(projects)
      .where(eq(projects.tenantId, tenantId))
      .orderBy(asc(projects.createdAt)),
  )
}

export async function getProjectBySlug(
  tenantId: string,
  slug: string,
): Promise<Project | null> {
  return withTenant(tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(projects)
      .where(and(eq(projects.tenantId, tenantId), eq(projects.slug, slug)))
      .limit(1)
    return rows[0] ?? null
  })
}

export async function createProject(input: {
  tenantId: string
  userId: string
  slug: string
  key: string
  name: string
  description?: string
}): Promise<{ ok: true; project: Project } | { ok: false; error: string }> {
  const slug = input.slug.trim().toLowerCase()
  const key = input.key.trim().toUpperCase()
  const name = input.name.trim()

  const slugError = validateProjectSlug(slug)
  if (slugError) return { ok: false, error: slugError }
  const keyError = validateProjectKey(key)
  if (keyError) return { ok: false, error: keyError }
  if (name.length < 2) return { ok: false, error: 'Nama proyek terlalu pendek.' }

  return withTenant(input.tenantId, async (tx) => {
    const conflicts = await tx
      .select({ slug: projects.slug, key: projects.key })
      .from(projects)
      .where(
        and(
          eq(projects.tenantId, input.tenantId),
          sql`(${projects.slug} = ${slug} OR ${projects.key} = ${key})`,
        ),
      )
      .limit(2)
    for (const c of conflicts) {
      if (c.slug === slug) return { ok: false, error: 'Slug proyek sudah dipakai.' } as const
      if (c.key === key) return { ok: false, error: 'Kode proyek sudah dipakai.' } as const
    }

    const [project] = await tx
      .insert(projects)
      .values({
        tenantId: input.tenantId,
        slug,
        key,
        name,
        description: input.description?.trim() || null,
        createdBy: input.userId,
      })
      .returning()
    return { ok: true, project } as const
  })
}

export interface IssueWithPeople {
  issue: Issue
  assignee: { id: string; name: string; email: string } | null
  creator: { id: string; name: string; email: string }
}

export async function listIssues(input: {
  tenantId: string
  projectId: string
}): Promise<IssueWithPeople[]> {
  return withTenant(input.tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(issues)
      .where(and(eq(issues.tenantId, input.tenantId), eq(issues.projectId, input.projectId)))
      .orderBy(asc(issues.status), desc(issues.createdAt))

    const userIds = new Set<string>()
    for (const r of rows) {
      userIds.add(r.createdBy)
      if (r.assigneeId) userIds.add(r.assigneeId)
    }
    if (userIds.size === 0) return []

    const userRows = await tx
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(sql`${users.id} IN ${Array.from(userIds)}`)
    const byId = new Map(userRows.map((u) => [u.id, u]))

    return rows.map((issue) => ({
      issue,
      creator: byId.get(issue.createdBy)!,
      assignee: issue.assigneeId ? byId.get(issue.assigneeId) ?? null : null,
    }))
  })
}

export async function createIssue(input: {
  tenantId: string
  projectId: string
  userId: string
  title: string
  body?: string
  priority?: IssuePriority
  assigneeId?: string | null
}): Promise<{ ok: true; issue: Issue } | { ok: false; error: string }> {
  const title = input.title.trim()
  if (title.length < 2) return { ok: false, error: 'Judul terlalu pendek.' }
  if (title.length > 255) return { ok: false, error: 'Judul terlalu panjang.' }

  return withTenant(input.tenantId, async (tx) => {
    const [project] = await tx
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, input.projectId), eq(projects.tenantId, input.tenantId)))
      .limit(1)
    if (!project) return { ok: false, error: 'Proyek tidak ditemukan.' } as const

    const [latest] = await tx
      .select({ max: sql<number>`COALESCE(MAX(${issues.number}), 0)` })
      .from(issues)
      .where(eq(issues.projectId, input.projectId))
    const number = (latest?.max ?? 0) + 1

    const [issue] = await tx
      .insert(issues)
      .values({
        tenantId: input.tenantId,
        projectId: input.projectId,
        number,
        title,
        body: input.body?.trim() || null,
        priority: input.priority ?? 'none',
        assigneeId: input.assigneeId ?? null,
        createdBy: input.userId,
      })
      .returning()
    return { ok: true, issue } as const
  })
}

export async function updateIssue(input: {
  tenantId: string
  issueId: string
  patch: {
    title?: string
    body?: string | null
    status?: IssueStatus
    priority?: IssuePriority
    assigneeId?: string | null
  }
}): Promise<{ ok: true; issue: Issue } | { ok: false; error: string }> {
  const update: Record<string, unknown> = { updatedAt: new Date() }

  if (input.patch.title !== undefined) {
    const t = input.patch.title.trim()
    if (t.length < 2) return { ok: false, error: 'Judul terlalu pendek.' }
    update.title = t
  }
  if (input.patch.body !== undefined) {
    update.body = input.patch.body?.trim() || null
  }
  if (input.patch.status !== undefined) update.status = input.patch.status
  if (input.patch.priority !== undefined) update.priority = input.patch.priority
  if (input.patch.assigneeId !== undefined) update.assigneeId = input.patch.assigneeId

  return withTenant(input.tenantId, async (tx) => {
    const [issue] = await tx
      .update(issues)
      .set(update)
      .where(and(eq(issues.id, input.issueId), eq(issues.tenantId, input.tenantId)))
      .returning()
    if (!issue) return { ok: false, error: 'Issue tidak ditemukan.' } as const
    return { ok: true, issue } as const
  })
}

/**
 * Tenant member directory, used to populate the assignee picker. Returns
 * lightweight rows — full user records aren't needed in the UI.
 */
/** Resolves "KAN-42" → the issue row. Returns null if not found or bad format. */
export async function getIssueByKey(
  tenantId: string,
  issueKey: string,
): Promise<Issue | null> {
  const m = /^([A-Z][A-Z0-9]{1,7})-(\d+)$/.exec(issueKey.trim().toUpperCase())
  if (!m) return null
  const [, projectKey, numberStr] = m
  const number = parseInt(numberStr, 10)

  return withTenant(tenantId, async (tx) => {
    const [project] = await tx
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.tenantId, tenantId), eq(projects.key, projectKey!)))
      .limit(1)
    if (!project) return null

    const [issue] = await tx
      .select()
      .from(issues)
      .where(and(eq(issues.projectId, project.id), eq(issues.number, number)))
      .limit(1)
    return issue ?? null
  })
}

export async function listTenantMembers(
  tenantId: string,
): Promise<{ id: string; name: string; email: string }[]> {
  return withTenant(tenantId, (tx) =>
    tx
      .select({ id: users.id, name: users.name, email: users.email })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(eq(memberships.tenantId, tenantId))
      .orderBy(asc(users.name)),
  )
}
