import { uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core'
import { platform } from './tenants'
import { users } from './users'
import { tenants } from './tenants'

/**
 * Append-only audit log. Every security-sensitive write — sign-in, mandate
 * grant/revoke, invite, member role change, agent creation, settings update —
 * lands here. Required for enterprise procurement (SOC 2, POJK 11/2022,
 * ISO 27001 §A.12.4).
 *
 * Not under RLS: writes go through the recordAudit() helper which always
 * carries the tenant_id explicitly. Reads are admin-only via /settings/audit
 * (built in a later phase) and use an explicit `where tenant_id =` filter
 * just like every other tenant-scoped query.
 */
export const auditLog = platform.table(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Nullable for cross-tenant events (e.g. failed sign-in for unknown user). */
    tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
    /** Nullable for unauthenticated events. */
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    /** Dot-namespaced verb. Examples: auth.sign_in, agent.mandate_grant. */
    action: varchar('action', { length: 64 }).notNull(),
    /** Optional pointer to the affected resource (e.g. an agent id). */
    resourceType: varchar('resource_type', { length: 64 }),
    resourceId: uuid('resource_id'),
    /** Free-form structured context — keep PII to a minimum. */
    payload: jsonb('payload').notNull().default({}),
    /** Best-effort, not trusted. */
    ip: varchar('ip', { length: 64 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantCreatedIdx: index('audit_log_tenant_created_idx').on(t.tenantId, t.createdAt),
    actionIdx: index('audit_log_action_idx').on(t.action),
  }),
)

export type AuditLogEntry = typeof auditLog.$inferSelect
export type NewAuditLogEntry = typeof auditLog.$inferInsert
