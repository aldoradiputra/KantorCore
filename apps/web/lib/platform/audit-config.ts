import 'server-only'
import { recordAudit } from '../audit'

/**
 * Canonical config-mutation audit writer. Every change to a tenant's
 * configuration surface — models, fields, policies, roles, views, triggers,
 * approval rules — should call this so that "Configuration History" is a
 * reliable view of who changed what and when.
 *
 * Action shape: `config.<resource>.<verb>` (e.g. `config.policy.created`).
 */
export function auditConfig(input: {
  tenantId: string
  actorUserId?: string | null
  resource:
    | 'model'
    | 'field'
    | 'policy'
    | 'role'
    | 'role_assignment'
    | 'view'
    | 'trigger'
    | 'security_policy'
    | 'approval_request'
  verb: 'created' | 'updated' | 'deleted' | 'enabled' | 'disabled' | 'granted' | 'revoked'
  resourceId?: string | null
  payload?: Record<string, unknown>
}): void {
  void recordAudit({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId ?? null,
    action: `config.${input.resource}.${input.verb}`,
    resourceType: `platform.${input.resource}`,
    resourceId: input.resourceId ?? null,
    payload: input.payload ?? {},
  }).catch(() => {})
}

/** Prefix used by the Configuration History view to filter audit_log. */
export const CONFIG_AUDIT_PREFIX = 'config.'
