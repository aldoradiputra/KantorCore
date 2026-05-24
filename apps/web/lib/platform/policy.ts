import 'server-only'
import { and, eq, inArray } from 'drizzle-orm'
import {
  policies,
  customRoles,
  roleAssignments,
  memberships,
  type Policy,
  type CustomRole,
  type PolicyPrincipalType,
} from '@kantorcore/db'
import { withTenant } from '../db'

export interface ActorRoles {
  membershipRole: 'owner' | 'admin' | 'member' | null
  customRoleKeys: string[]
}

/**
 * Resolve all roles for a user in a tenant: their membership role + any
 * custom role assignments. Cached per-call by the caller if needed.
 */
export async function resolveActorRoles(
  tenantId: string,
  userId: string,
): Promise<ActorRoles> {
  return withTenant(tenantId, async (tx) => {
    const [m] = await tx
      .select({ role: memberships.role })
      .from(memberships)
      .where(and(eq(memberships.tenantId, tenantId), eq(memberships.userId, userId)))
      .limit(1)

    const assignments = await tx
      .select({ key: customRoles.key })
      .from(roleAssignments)
      .innerJoin(customRoles, eq(customRoles.id, roleAssignments.roleId))
      .where(
        and(
          eq(roleAssignments.tenantId, tenantId),
          eq(roleAssignments.userId, userId),
        ),
      )

    return {
      membershipRole: m?.role ?? null,
      customRoleKeys: assignments.map((a) => a.key),
    }
  })
}

/**
 * Returns true if the user is allowed to perform `action` on `resource`
 * under the given `context`.
 *
 * Default-allow for owner/admin if no DENY policy matches. For others,
 * default-deny unless an ALLOW policy matches.
 *
 * Policies are evaluated by priority (DESC). At equal priority, DENY wins.
 */
export async function can(input: {
  tenantId: string
  userId: string
  action: string
  resource: string
  context?: Record<string, unknown>
}): Promise<boolean> {
  const { tenantId, userId, action, resource, context = {} } = input

  const actor = await resolveActorRoles(tenantId, userId)

  // Owners always pass — they're the tenant root.
  if (actor.membershipRole === 'owner') return true

  const allPolicies = await withTenant(tenantId, (tx) =>
    tx
      .select()
      .from(policies)
      .where(and(eq(policies.tenantId, tenantId), eq(policies.isActive, true))),
  )

  // Filter to policies whose resource+action+principal match this request
  const matching = allPolicies.filter((p) => {
    if (!resourceMatches(p.resource, resource)) return false
    if (!actionMatches(p.action, action)) return false
    if (!principalMatches(p, actor, userId)) return false
    if (!conditionsMatch(p.conditions, context)) return false
    return true
  })

  if (matching.length === 0) {
    // No policies match → default-allow for admin, default-deny for others
    return actor.membershipRole === 'admin'
  }

  // Sort by priority DESC, then deny-first within equal priority
  matching.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority
    if (a.effect === 'deny' && b.effect !== 'deny') return -1
    if (b.effect === 'deny' && a.effect !== 'deny') return 1
    return 0
  })

  return matching[0]!.effect === 'allow'
}

// ── Matchers ─────────────────────────────────────────────────────────────────

function resourceMatches(pattern: string, resource: string): boolean {
  if (pattern === resource) return true
  if (pattern === '*') return true
  if (pattern.endsWith(':*')) {
    const prefix = pattern.slice(0, -1) // keep the colon
    return resource.startsWith(prefix)
  }
  if (pattern.endsWith('.*')) {
    const prefix = pattern.slice(0, -1)
    return resource.startsWith(prefix)
  }
  return false
}

function actionMatches(pattern: string, action: string): boolean {
  if (pattern === '*') return true
  if (pattern === action) return true
  if (pattern.endsWith(':*')) {
    return action.startsWith(pattern.slice(0, -1))
  }
  return false
}

function principalMatches(
  policy: Policy,
  actor: ActorRoles,
  userId: string,
): boolean {
  const t: PolicyPrincipalType = policy.principalType
  if (t === 'any') return true
  if (t === 'user') return policy.principalId === userId
  if (t === 'membership_role') {
    if (!actor.membershipRole) return false
    return policy.principalId === actor.membershipRole
  }
  if (t === 'custom_role') {
    return policy.principalId !== null && actor.customRoleKeys.includes(policy.principalId)
  }
  return false
}

/**
 * Tiny condition evaluator. Shape:
 *   { "field": { "op": "...", "value": ... } }
 * Ops: eq, ne, gt, gte, lt, lte, in, not_in
 * Field paths support dot notation: 'amount', 'record.status'.
 */
function conditionsMatch(
  conditions: Record<string, unknown>,
  context: Record<string, unknown>,
): boolean {
  if (!conditions || Object.keys(conditions).length === 0) return true
  for (const [field, rule] of Object.entries(conditions)) {
    if (!rule || typeof rule !== 'object') continue
    const r = rule as { op?: string; value?: unknown }
    const actual = readPath(context, field)
    if (!evalOp(r.op ?? 'eq', actual, r.value)) return false
  }
  return true
}

function readPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

function evalOp(op: string, actual: unknown, expected: unknown): boolean {
  switch (op) {
    case 'eq': return actual === expected
    case 'ne': return actual !== expected
    case 'gt': return typeof actual === 'number' && typeof expected === 'number' && actual > expected
    case 'gte': return typeof actual === 'number' && typeof expected === 'number' && actual >= expected
    case 'lt': return typeof actual === 'number' && typeof expected === 'number' && actual < expected
    case 'lte': return typeof actual === 'number' && typeof expected === 'number' && actual <= expected
    case 'in': return Array.isArray(expected) && (expected as unknown[]).includes(actual)
    case 'not_in': return Array.isArray(expected) && !(expected as unknown[]).includes(actual)
    default: return false
  }
}

// ── Policy CRUD ─────────────────────────────────────────────────────────────

export async function listPolicies(tenantId: string): Promise<Policy[]> {
  return withTenant(tenantId, (tx) =>
    tx.select().from(policies).where(eq(policies.tenantId, tenantId)),
  )
}

export async function createPolicy(input: {
  tenantId: string
  name: string
  description?: string | null
  resource: string
  action: string
  effect: 'allow' | 'deny'
  principalType: PolicyPrincipalType
  principalId?: string | null
  conditions?: Record<string, unknown>
  priority?: number
}): Promise<{ ok: true; policy: Policy } | { ok: false; error: string }> {
  if (!input.name.trim()) return { ok: false, error: 'Nama wajib diisi.' }
  if (!input.resource.trim()) return { ok: false, error: 'Resource wajib diisi.' }
  if (!input.action.trim()) return { ok: false, error: 'Action wajib diisi.' }
  if (input.principalType !== 'any' && !input.principalId) {
    return { ok: false, error: 'Principal ID wajib untuk principal type ini.' }
  }

  const rows = await withTenant(input.tenantId, (tx) =>
    tx
      .insert(policies)
      .values({
        tenantId: input.tenantId,
        name: input.name.trim(),
        description: input.description?.trim() ?? null,
        resource: input.resource.trim(),
        action: input.action.trim(),
        effect: input.effect,
        principalType: input.principalType,
        principalId: input.principalId ?? null,
        conditions: input.conditions ?? {},
        priority: input.priority ?? 100,
      })
      .returning(),
  )
  return { ok: true, policy: rows[0]! }
}

export async function deletePolicy(
  tenantId: string,
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const rows = await withTenant(tenantId, (tx) =>
    tx
      .delete(policies)
      .where(and(eq(policies.tenantId, tenantId), eq(policies.id, id)))
      .returning({ id: policies.id }),
  )
  if (rows.length === 0) return { ok: false, error: 'Policy tidak ditemukan.' }
  return { ok: true }
}

// ── Custom roles CRUD ───────────────────────────────────────────────────────

export async function listCustomRoles(tenantId: string): Promise<CustomRole[]> {
  return withTenant(tenantId, (tx) =>
    tx.select().from(customRoles).where(eq(customRoles.tenantId, tenantId)),
  )
}

export async function createCustomRole(input: {
  tenantId: string
  key: string
  name: string
  description?: string | null
}): Promise<{ ok: true; role: CustomRole } | { ok: false; error: string }> {
  if (!/^[a-z][a-z0-9_]*$/.test(input.key)) {
    return { ok: false, error: 'Key harus lowercase + underscore, mulai dari huruf.' }
  }
  if (!input.name.trim()) return { ok: false, error: 'Nama wajib diisi.' }

  try {
    const rows = await withTenant(input.tenantId, (tx) =>
      tx
        .insert(customRoles)
        .values({
          tenantId: input.tenantId,
          key: input.key,
          name: input.name.trim(),
          description: input.description?.trim() ?? null,
        })
        .returning(),
    )
    return { ok: true, role: rows[0]! }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('unique')) return { ok: false, error: `Key '${input.key}' sudah dipakai.` }
    return { ok: false, error: msg }
  }
}

export async function deleteCustomRole(
  tenantId: string,
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const rows = await withTenant(tenantId, (tx) =>
    tx
      .delete(customRoles)
      .where(
        and(
          eq(customRoles.tenantId, tenantId),
          eq(customRoles.id, id),
          eq(customRoles.isSystem, false),
        ),
      )
      .returning({ id: customRoles.id }),
  )
  if (rows.length === 0) return { ok: false, error: 'Role tidak ditemukan atau sistem.' }
  return { ok: true }
}

export async function assignRole(input: {
  tenantId: string
  userId: string
  roleId: string
  grantedBy: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await withTenant(input.tenantId, (tx) =>
      tx
        .insert(roleAssignments)
        .values({
          tenantId: input.tenantId,
          userId: input.userId,
          roleId: input.roleId,
          grantedBy: input.grantedBy,
        })
        .onConflictDoNothing(),
    )
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

export async function unassignRole(input: {
  tenantId: string
  userId: string
  roleId: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await withTenant(input.tenantId, (tx) =>
    tx
      .delete(roleAssignments)
      .where(
        and(
          eq(roleAssignments.tenantId, input.tenantId),
          eq(roleAssignments.userId, input.userId),
          eq(roleAssignments.roleId, input.roleId),
        ),
      ),
  )
  return { ok: true }
}

export async function listUserAssignments(
  tenantId: string,
  userIds: string[],
): Promise<Map<string, string[]>> {
  if (userIds.length === 0) return new Map()
  const rows = await withTenant(tenantId, (tx) =>
    tx
      .select({ userId: roleAssignments.userId, roleKey: customRoles.key })
      .from(roleAssignments)
      .innerJoin(customRoles, eq(customRoles.id, roleAssignments.roleId))
      .where(
        and(
          eq(roleAssignments.tenantId, tenantId),
          inArray(roleAssignments.userId, userIds),
        ),
      ),
  )
  const out = new Map<string, string[]>()
  for (const r of rows) {
    const list = out.get(r.userId) ?? []
    list.push(r.roleKey)
    out.set(r.userId, list)
  }
  return out
}
