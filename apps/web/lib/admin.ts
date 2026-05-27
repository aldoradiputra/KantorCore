import 'server-only'
import { and, countDistinct, desc, eq, gt, inArray, sql } from 'drizzle-orm'
import {
  groups,
  groupMembers,
  directoryProfiles,
  workspaceSecurityPolicy,
  auditLog,
  memberships,
  users,
  type Group,
  type DirectoryProfile,
  type WorkspaceSecurityPolicy,
  type AuditLogEntry,
} from '@kantorcore/db'
import { withTenant } from './db'

/* ── Groups ──────────────────────────────────────────────────────────── */

export interface GroupRow {
  group: Group
  memberCount: number
  members: { id: string; name: string; email: string }[]
}

export async function listGroups(tenantId: string): Promise<GroupRow[]> {
  return withTenant(tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(groups)
      .where(eq(groups.tenantId, tenantId))
      .orderBy(groups.createdAt)

    if (rows.length === 0) return []

    const memberRows = await tx
      .select({ groupId: groupMembers.groupId, userId: users.id, name: users.name, email: users.email })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(eq(groupMembers.tenantId, tenantId))

    return rows.map((g) => {
      const members = memberRows
        .filter((m) => m.groupId === g.id)
        .map((m) => ({ id: m.userId, name: m.name, email: m.email }))
      return { group: g, memberCount: members.length, members }
    })
  })
}

export async function createGroup(input: {
  tenantId: string
  userId: string
  name: string
  description?: string
  emailAlias?: string
}): Promise<{ ok: true; group: Group } | { ok: false; error: string }> {
  const name = input.name.trim()
  if (!name || name.length < 2) return { ok: false, error: 'Nama grup minimal 2 karakter.' }
  if (name.length > 128) return { ok: false, error: 'Nama grup maksimal 128 karakter.' }

  return withTenant(input.tenantId, async (tx) => {
    const conflict = await tx
      .select({ id: groups.id })
      .from(groups)
      .where(and(eq(groups.tenantId, input.tenantId), eq(groups.name, name)))
      .limit(1)
    if (conflict.length > 0) return { ok: false, error: 'Nama grup sudah digunakan.' }

    const [group] = await tx
      .insert(groups)
      .values({
        tenantId: input.tenantId,
        name,
        description: input.description?.trim() || null,
        emailAlias: input.emailAlias?.trim().toLowerCase() || null,
        createdBy: input.userId,
      })
      .returning()
    return { ok: true, group: group! }
  })
}

export async function deleteGroup(tenantId: string, groupId: string): Promise<void> {
  await withTenant(tenantId, (tx) =>
    tx.delete(groups).where(and(eq(groups.id, groupId), eq(groups.tenantId, tenantId))),
  )
}

export async function setGroupMembers(
  tenantId: string,
  groupId: string,
  userIds: string[],
): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    await tx
      .delete(groupMembers)
      .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.tenantId, tenantId)))
    if (userIds.length > 0) {
      await tx.insert(groupMembers).values(
        userIds.map((userId) => ({ groupId, userId, tenantId })),
      )
    }
  })
}

/* ── Directory profiles ──────────────────────────────────────────────── */

export interface DirectoryRow {
  user: { id: string; name: string; email: string }
  profile: DirectoryProfile | null
  manager: { id: string; name: string } | null
  role: string
}

export async function listDirectory(tenantId: string): Promise<DirectoryRow[]> {
  return withTenant(tenantId, async (tx) => {
    const memberRows = await tx
      .select({ userId: memberships.userId, role: memberships.role, name: users.name, email: users.email })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(eq(memberships.tenantId, tenantId))
      .orderBy(users.name)

    if (memberRows.length === 0) return []

    const userIds = memberRows.map((m) => m.userId)
    const profiles = await tx
      .select()
      .from(directoryProfiles)
      .where(and(eq(directoryProfiles.tenantId, tenantId), inArray(directoryProfiles.userId, userIds)))

    const managerIds = profiles
      .map((p) => p.managerId)
      .filter((id): id is string => !!id)
    const managers =
      managerIds.length > 0
        ? await tx.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, managerIds))
        : []

    return memberRows.map((m) => {
      const profile = profiles.find((p) => p.userId === m.userId) ?? null
      const manager = profile?.managerId ? managers.find((u) => u.id === profile.managerId) ?? null : null
      return { user: { id: m.userId, name: m.name, email: m.email }, profile, manager, role: m.role }
    })
  })
}

export async function upsertDirectoryProfile(input: {
  tenantId: string
  userId: string
  department?: string
  jobTitle?: string
  managerId?: string | null
  employeeId?: string
  phone?: string
}): Promise<DirectoryProfile> {
  return withTenant(input.tenantId, async (tx) => {
    const [row] = await tx
      .insert(directoryProfiles)
      .values({
        tenantId: input.tenantId,
        userId: input.userId,
        department: input.department ?? null,
        jobTitle: input.jobTitle ?? null,
        managerId: input.managerId ?? null,
        employeeId: input.employeeId ?? null,
        phone: input.phone ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [directoryProfiles.tenantId, directoryProfiles.userId],
        set: {
          department: input.department ?? null,
          jobTitle: input.jobTitle ?? null,
          managerId: input.managerId ?? null,
          employeeId: input.employeeId ?? null,
          phone: input.phone ?? null,
          updatedAt: new Date(),
        },
      })
      .returning()
    return row!
  })
}

/* ── Security policy ─────────────────────────────────────────────────── */

export async function getSecurityPolicy(tenantId: string): Promise<WorkspaceSecurityPolicy | null> {
  return withTenant(tenantId, async (tx) => {
    const rows = await tx
      .select()
      .from(workspaceSecurityPolicy)
      .where(eq(workspaceSecurityPolicy.tenantId, tenantId))
      .limit(1)
    return rows[0] ?? null
  })
}

export type CopyInfoMinRole = 'owner' | 'admin' | 'member'

export async function saveSecurityPolicy(input: {
  tenantId: string
  updatedBy: string
  require2fa: boolean
  passwordMinLength: number
  sessionTimeoutHours: number
  ipAllowlist: string[]
  copyInfoMinRole: CopyInfoMinRole
}): Promise<WorkspaceSecurityPolicy> {
  return withTenant(input.tenantId, async (tx) => {
    const [row] = await tx
      .insert(workspaceSecurityPolicy)
      .values({
        tenantId: input.tenantId,
        require2fa: input.require2fa,
        passwordMinLength: input.passwordMinLength,
        sessionTimeoutHours: input.sessionTimeoutHours,
        ipAllowlist: input.ipAllowlist,
        copyInfoMinRole: input.copyInfoMinRole,
        updatedAt: new Date(),
        updatedBy: input.updatedBy,
      })
      .onConflictDoUpdate({
        target: [workspaceSecurityPolicy.tenantId],
        set: {
          require2fa: input.require2fa,
          passwordMinLength: input.passwordMinLength,
          sessionTimeoutHours: input.sessionTimeoutHours,
          ipAllowlist: input.ipAllowlist,
          copyInfoMinRole: input.copyInfoMinRole,
          updatedAt: new Date(),
          updatedBy: input.updatedBy,
        },
      })
      .returning()
    return row!
  })
}

/**
 * Returns true when the given membership role meets the workspace's minimum
 * role for the "Salin info" copy-record feature. Defaults to permissive
 * ('member' = everyone) when the policy row hasn't been created yet.
 */
const ROLE_RANK: Record<CopyInfoMinRole, number> = { member: 0, admin: 1, owner: 2 }

export function canCopyRecordInfo(
  role: 'owner' | 'admin' | 'member',
  policy: WorkspaceSecurityPolicy | null,
): boolean {
  const minRole = (policy?.copyInfoMinRole ?? 'member') as CopyInfoMinRole
  return ROLE_RANK[role] >= ROLE_RANK[minRole]
}

/* ── Audit log ───────────────────────────────────────────────────────── */

export interface AuditRow {
  entry: AuditLogEntry
  actorName: string | null
  actorEmail: string | null
}

export async function listAuditLog(
  tenantId: string,
  limit = 100,
  offset = 0,
  opts: { actionPrefix?: string } = {},
): Promise<AuditRow[]> {
  return withTenant(tenantId, async (tx) => {
    const conds = [eq(auditLog.tenantId, tenantId)]
    if (opts.actionPrefix) {
      conds.push(sql`${auditLog.action} LIKE ${opts.actionPrefix + '%'}`)
    }
    const rows = await tx
      .select({
        entry: auditLog,
        actorName: users.name,
        actorEmail: users.email,
      })
      .from(auditLog)
      .leftJoin(users, eq(auditLog.actorUserId, users.id))
      .where(and(...conds))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit)
      .offset(offset)
    return rows
  })
}

/* ── Activity bucketing ──────────────────────────────────────────────── */

export interface ActivityBucket {
  bucket: string   // ISO datetime string (hour or day truncated)
  category: string // first dot-segment of action: "auth" | "config" | "agent" | …
  count: number
}

export interface ActivityPoint {
  bucket: string
  [category: string]: number | string
}

/** Groups audit_log rows by time bucket + action category for charting. */
export async function getActivityBuckets(
  tenantId: string,
  opts: { granularity: 'hour' | 'day'; lookback: number /* hours */ },
): Promise<ActivityBucket[]> {
  return withTenant(tenantId, async (tx) => {
    const rows = await tx.execute(sql`
      SELECT
        date_trunc(${opts.granularity}, created_at) AS bucket,
        split_part(action, '.', 1)                  AS category,
        count(*)::int                               AS count
      FROM platform.audit_log
      WHERE tenant_id = ${tenantId}::uuid
        AND created_at > NOW() - (${opts.lookback} || ' hours')::interval
      GROUP BY 1, 2
      ORDER BY 1 ASC
    `)
    return (rows as { bucket: Date; category: string; count: number }[]).map((r) => ({
      bucket: r.bucket.toISOString(),
      category: r.category,
      count: r.count,
    }))
  })
}

/** Pivots flat bucket rows into wide format suitable for recharts. */
export function pivotBuckets(rows: ActivityBucket[]): {
  data: ActivityPoint[]
  categories: string[]
} {
  const catSet = new Set<string>()
  const byBucket = new Map<string, ActivityPoint>()
  for (const r of rows) {
    catSet.add(r.category)
    let point = byBucket.get(r.bucket)
    if (!point) {
      point = { bucket: r.bucket }
      byBucket.set(r.bucket, point)
    }
    point[r.category] = r.count
  }
  const categories = [...catSet].sort()
  const data = [...byBucket.values()].map((p) => {
    for (const cat of categories) {
      if (!(cat in p)) p[cat] = 0
    }
    return p
  })
  return { data, categories }
}

export interface ActivityStats {
  eventsLast24h: number
  activeUsersLast24h: number
  topCategory: string | null
}

/** Summary stats for the ops dashboard stats row. */
export async function getActivityStats(tenantId: string): Promise<ActivityStats> {
  return withTenant(tenantId, async (tx) => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const [countRow, userRow, topRow] = await Promise.all([
      tx
        .select({ n: sql<number>`count(*)::int` })
        .from(auditLog)
        .where(and(eq(auditLog.tenantId, tenantId), gt(auditLog.createdAt, cutoff))),
      tx
        .select({ n: countDistinct(auditLog.actorUserId) })
        .from(auditLog)
        .where(and(eq(auditLog.tenantId, tenantId), gt(auditLog.createdAt, cutoff))),
      tx.execute(sql`
        SELECT split_part(action, '.', 1) AS category, count(*)::int AS n
        FROM platform.audit_log
        WHERE tenant_id = ${tenantId}::uuid
          AND created_at > NOW() - interval '24 hours'
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 1
      `),
    ])
    return {
      eventsLast24h: (countRow[0]?.n ?? 0) as number,
      activeUsersLast24h: (userRow[0]?.n ?? 0) as number,
      topCategory: ((topRow as { category: string }[])[0]?.category) ?? null,
    }
  })
}
