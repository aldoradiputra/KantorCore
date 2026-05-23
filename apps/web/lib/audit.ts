import 'server-only'
import { auditLog } from '@kantorcore/db'
import { getDb } from './db'

export interface AuditInput {
  /** Null for unauthenticated or cross-tenant events (e.g. failed sign-in). */
  tenantId?: string | null
  /** Null when no user is attached yet. */
  actorUserId?: string | null
  /** Dot-namespaced verb, e.g. auth.sign_in, agent.mandate_grant. */
  action: string
  resourceType?: string | null
  resourceId?: string | null
  payload?: Record<string, unknown>
  ip?: string | null
  userAgent?: string | null
}

/**
 * Append-only audit writer. Fire-and-forget from the caller's point of view —
 * if the insert fails we log to stderr and swallow, because losing one audit
 * row is preferable to failing the actual user action. Acceptable trade-off
 * for now; if SOC 2 demands stricter guarantees we'll route through an
 * append-only queue with retry.
 *
 * NOTE: audit_log is not RLS-protected — the tenant_id is written explicitly
 * by the caller and read paths (admin-only) use explicit `where tenant_id =`
 * filters. The table is treated as platform-level infrastructure.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await getDb()
      .insert(auditLog)
      .values({
        tenantId: input.tenantId ?? null,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        resourceType: input.resourceType ?? null,
        resourceId: input.resourceId ?? null,
        payload: input.payload ?? {},
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      })
  } catch (err) {
    console.error('[audit] insert failed', { action: input.action, err })
  }
}

/** Extract caller IP + UA from a Next.js Request, best-effort. */
export function auditMetaFromRequest(req: Request): { ip: string | null; userAgent: string | null } {
  const fwd = req.headers.get('x-forwarded-for')
  const ip = fwd ? fwd.split(',')[0]?.trim() ?? null : req.headers.get('x-real-ip')
  return { ip: ip ?? null, userAgent: req.headers.get('user-agent') }
}
