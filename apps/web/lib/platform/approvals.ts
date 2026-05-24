import 'server-only'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { approvals, type Approval, type ApprovalStatus } from '@kantorcore/db'
import { withTenant } from '../db'
import { resolveActorRoles } from './policy'
import { recordAudit } from '../audit'

export type { Approval, ApprovalStatus }

export async function createApproval(input: {
  tenantId: string
  resourceType: string
  resourceId: string
  action: string
  title: string
  description?: string | null
  requesterId?: string | null
  requiredRole?: string | null
  context?: Record<string, unknown>
}): Promise<Approval> {
  const rows = await withTenant(input.tenantId, (tx) =>
    tx
      .insert(approvals)
      .values({
        tenantId: input.tenantId,
        resourceType: input.resourceType,
        resourceId: input.resourceId as `${string}-${string}-${string}-${string}-${string}`,
        action: input.action,
        title: input.title,
        description: input.description ?? null,
        requesterId: (input.requesterId as `${string}-${string}-${string}-${string}-${string}` | undefined) ?? null,
        requiredRole: input.requiredRole ?? null,
        context: input.context ?? {},
      })
      .returning(),
  )
  return rows[0]!
}

export async function listApprovals(
  tenantId: string,
  status?: ApprovalStatus,
): Promise<Approval[]> {
  return withTenant(tenantId, (tx) => {
    const where = status
      ? and(eq(approvals.tenantId, tenantId), eq(approvals.status, status))
      : eq(approvals.tenantId, tenantId)
    return tx
      .select()
      .from(approvals)
      .where(where!)
      .orderBy(desc(approvals.createdAt))
      .limit(200)
  })
}

export async function getApproval(
  tenantId: string,
  id: string,
): Promise<Approval | null> {
  const rows = await withTenant(tenantId, (tx) =>
    tx
      .select()
      .from(approvals)
      .where(and(eq(approvals.tenantId, tenantId), eq(approvals.id, id)))
      .limit(1),
  )
  return rows[0] ?? null
}

export async function decideApproval(input: {
  tenantId: string
  approvalId: string
  actorId: string
  decision: 'approved' | 'rejected'
  notes?: string
  onApproved?: (approval: Approval) => Promise<void>
}): Promise<{ ok: true; approval: Approval } | { ok: false; error: string }> {
  const existing = await getApproval(input.tenantId, input.approvalId)
  if (!existing) return { ok: false, error: 'Approval tidak ditemukan.' }
  if (existing.status !== 'pending') {
    return { ok: false, error: 'Approval sudah diputuskan.' }
  }

  // Authorization: actor must have the required_role (or be admin/owner)
  const actor = await resolveActorRoles(input.tenantId, input.actorId)
  const isPrivileged = actor.membershipRole === 'owner' || actor.membershipRole === 'admin'
  if (!isPrivileged && existing.requiredRole) {
    if (!actor.customRoleKeys.includes(existing.requiredRole)) {
      return { ok: false, error: 'Anda tidak memiliki peran yang dipersyaratkan.' }
    }
  } else if (!isPrivileged && !existing.requiredRole) {
    return { ok: false, error: 'Hanya admin/owner yang dapat memutuskan.' }
  }

  const rows = await withTenant(input.tenantId, (tx) =>
    tx
      .update(approvals)
      .set({
        status: input.decision,
        decidedBy: input.actorId as `${string}-${string}-${string}-${string}-${string}`,
        decidedAt: new Date(),
        decisionNotes: input.notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(approvals.id, input.approvalId))
      .returning(),
  )
  const updated = rows[0]!

  void recordAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorId,
    action: `approval.${input.decision}`,
    resourceType: 'platform.approvals',
    resourceId: updated.id,
    payload: { resource_type: updated.resourceType, resource_id: updated.resourceId },
  }).catch(() => {})

  if (input.decision === 'approved' && input.onApproved) {
    try {
      await input.onApproved(updated)
    } catch {
      // post-approval action failures should not roll back the decision
    }
  }

  return { ok: true, approval: updated }
}

export async function cancelApproval(
  tenantId: string,
  approvalId: string,
  actorId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await getApproval(tenantId, approvalId)
  if (!existing) return { ok: false, error: 'Approval tidak ditemukan.' }
  if (existing.status !== 'pending') return { ok: false, error: 'Sudah diputuskan.' }
  if (existing.requesterId && existing.requesterId !== actorId) {
    const actor = await resolveActorRoles(tenantId, actorId)
    if (actor.membershipRole !== 'owner' && actor.membershipRole !== 'admin') {
      return { ok: false, error: 'Hanya pemohon atau admin yang dapat membatalkan.' }
    }
  }
  await withTenant(tenantId, (tx) =>
    tx
      .update(approvals)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(approvals.id, approvalId)),
  )
  return { ok: true }
}

export async function listApprovalsForResources(
  tenantId: string,
  resourceType: string,
  resourceIds: string[],
): Promise<Map<string, Approval[]>> {
  if (resourceIds.length === 0) return new Map()
  const rows = await withTenant(tenantId, (tx) =>
    tx
      .select()
      .from(approvals)
      .where(
        and(
          eq(approvals.tenantId, tenantId),
          eq(approvals.resourceType, resourceType),
          inArray(approvals.resourceId, resourceIds),
        ),
      ),
  )
  const out = new Map<string, Approval[]>()
  for (const r of rows) {
    const list = out.get(r.resourceId) ?? []
    list.push(r)
    out.set(r.resourceId, list)
  }
  return out
}
