import 'server-only'
import { sql } from 'drizzle-orm'
import { withTenant } from '../db'
import { getModel } from './registry'

export type Role = 'owner' | 'admin' | 'member'
const RANK: Record<Role, number> = { member: 0, admin: 1, owner: 2 }

export interface TransitionResult {
  fromState: string
  toState: string
  label: string
}

/**
 * Apply a declarative status transition to a record.
 *
 * - Reads `platform.transitions` for the model
 * - Verifies a matching from→to row exists (from_state NULL means "any state")
 * - Verifies the actor's role meets transition.required_role
 * - Updates the underlying table's status column
 * - Returns the resolved transition for callers (caller decides about side
 *   effects like audit logging, chatter, downstream record creation — those
 *   land in Phase 4's workflow executor)
 *
 * Throws on any guard failure so route handlers can map to 400/403.
 */
export async function applyTransition(input: {
  tenantId: string
  modelKey: string
  recordId: string
  toState: string
  actorRole: Role
}): Promise<TransitionResult> {
  const { tenantId, modelKey, recordId, toState, actorRole } = input
  const def = await getModel(modelKey, tenantId)
  if (!def) throw new Error(`Unknown model: ${modelKey}`)
  if (!def.statusStates.length) throw new Error(`Model ${modelKey} has no status states.`)
  if (!def.statusStates.some((s) => s.key === toState)) {
    throw new Error(`Invalid target state: ${toState}`)
  }

  return withTenant(tenantId, async (tx) => {
    const currentResult = await tx.execute(sql`
      SELECT status FROM ${sql.identifier(def.model.schemaName)}.${sql.identifier(def.model.tableName)}
      WHERE id = ${recordId} AND tenant_id = ${tenantId}
      LIMIT 1
    `)
    const currentRow = (currentResult as unknown as { rows: { status: string | null }[] }).rows[0]
    if (!currentRow) throw new Error('Record not found.')
    const fromState = currentRow.status ?? ''

    // Find a matching transition: from_state = current OR from_state IS NULL (any)
    const t = def.transitions.find(
      (x) => x.toState === toState && (x.fromState === fromState || x.fromState === null),
    )
    if (!t) throw new Error(`Transisi ${fromState} → ${toState} tidak diizinkan.`)
    if (RANK[actorRole] < RANK[t.requiredRole as Role]) {
      throw new Error(`Role ${actorRole} tidak cukup untuk transisi ini (butuh ${t.requiredRole}).`)
    }

    await tx.execute(sql`
      UPDATE ${sql.identifier(def.model.schemaName)}.${sql.identifier(def.model.tableName)}
      SET status = ${toState}, updated_at = now()
      WHERE id = ${recordId} AND tenant_id = ${tenantId}
    `)

    return { fromState, toState, label: t.label }
  })
}
