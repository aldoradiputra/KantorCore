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
} from '@kantr/db'
import { getDb } from './db'

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
  return getDb()
    .select()
    .from(projects)
    .where(eq(projects.tenantId, tenantId))
    .orderBy(asc(projects.createdAt))
}

export async function getProjectBySlug(
  tenantId: string,
  slug: string,
): Promise<Project | null> {
  const rows = await getDb()
    .select()
    .from(projects)
    .where(and(eq(projects.tenantId, tenantId), eq(projects.slug, slug)))
    .limit(1)
  return rows[0] ?? null
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

  const db = getDb()
  const conflicts = await db
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
    if (c.slug === slug) return { ok: false, error: 'Slug proyek sudah dipakai.' }
    if (c.key === key) return { ok: false, error: 'Kode proyek sudah dipakai.' }
  }

  const [project] = await db
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
  return { ok: true, project }
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
  const db = getDb()
  // Two-step: fetch issues, then hydrate users. Avoids a triple-join that
  // Drizzle's type inference fights with for the nullable assignee FK.
  const rows = await db
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

  const userRows = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(sql`${users.id} IN ${Array.from(userIds)}`)
  const byId = new Map(userRows.map((u) => [u.id, u]))

  return rows.map((issue) => ({
    issue,
    creator: byId.get(issue.createdBy)!,
    assignee: issue.assigneeId ? byId.get(issue.assigneeId) ?? null : null,
  }))
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

  const db = getDb()

  // Verify project belongs to tenant and compute next issue number.
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, input.projectId), eq(projects.tenantId, input.tenantId)))
    .limit(1)
  if (!project) return { ok: false, error: 'Proyek tidak ditemukan.' }

  const [latest] = await db
    .select({ max: sql<number>`COALESCE(MAX(${issues.number}), 0)` })
    .from(issues)
    .where(eq(issues.projectId, input.projectId))
  const number = (latest?.max ?? 0) + 1

  const [issue] = await db
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
  return { ok: true, issue }
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
  const db = getDb()
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

  const [issue] = await db
    .update(issues)
    .set(update)
    .where(and(eq(issues.id, input.issueId), eq(issues.tenantId, input.tenantId)))
    .returning()
  if (!issue) return { ok: false, error: 'Issue tidak ditemukan.' }
  return { ok: true, issue }
}

/**
 * Tenant member directory, used to populate the assignee picker. Returns
 * lightweight rows — full user records aren't needed in the UI.
 */
export async function listTenantMembers(
  tenantId: string,
): Promise<{ id: string; name: string; email: string }[]> {
  return getDb()
    .select({ id: users.id, name: users.name, email: users.email })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.tenantId, tenantId))
    .orderBy(asc(users.name))
}
