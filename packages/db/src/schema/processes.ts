import {
  pgSchema,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

/**
 * IS-FLOW — Workflow Automation. The `flow` schema starts with the
 * Process Library (process_templates + process_steps): user-readable
 * documentation of canonical multi-record processes. Each template can
 * later be animated by IS-FLOW's execution engine; the same rows feed
 * both the docs view (now) and the runtime (later).
 *
 * Mode semantics:
 *   - deterministic: always-fires rules. No AI. Fully auditable + reversible
 *     where the underlying records allow it. (e.g. SO confirmed → DO created)
 *   - probabilistic: agent-driven. AI decides the path within declared scope.
 *     (e.g. expense approval routing based on policy + amount)
 *   - hybrid: mixed — some steps fixed, some delegated to the agent.
 *     (e.g. onboarding: account provisioning is deterministic, welcome packet
 *     drafting is probabilistic)
 */
export const flow = pgSchema('flow')

export const processMode = pgEnum('flow_process_mode', [
  'deterministic',
  'probabilistic',
  'hybrid',
])

export const stepKind = pgEnum('flow_step_kind', [
  'trigger',
  'action',
  'decision',
  'human',
  'agent',
])

// ── Process Templates ─────────────────────────────────────────────────────────
export const processTemplates = flow.table(
  'process_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    /**
     * Stable identifier across tenants — the seed manifest uses this to
     * upsert. Slugs from the manifest are reserved (is_system = true);
     * user-created processes must pick a different slug.
     */
    slug: varchar('slug', { length: 64 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    /** Which KantorCore module this primarily belongs to (e.g. 'sales', 'fin', 'hr', 'rent'). */
    module: varchar('module', { length: 32 }).notNull(),
    mode: processMode('mode').notNull(),
    description: text('description'),
    /**
     * Bumped when the seed manifest changes a system process. IS-FLOW (later)
     * checks this to detect upgrades; users can ack or fork before adopting.
     */
    manifestVersion: integer('manifest_version').notNull().default(1),
    isSystem: boolean('is_system').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantSlugUnique: uniqueIndex('flow_process_templates_tenant_slug_unique').on(
      t.tenantId,
      t.slug,
    ),
    tenantModuleIdx: index('flow_process_templates_tenant_module_idx').on(t.tenantId, t.module),
  }),
)

// ── Process Steps ─────────────────────────────────────────────────────────────
export const processSteps = flow.table(
  'process_steps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    processId: uuid('process_id')
      .notNull()
      .references(() => processTemplates.id, { onDelete: 'cascade' }),
    sequence: integer('sequence').notNull(),
    kind: stepKind('kind').notNull(),
    /** Per-step badge — most steps inherit the process mode, but a hybrid
     *  process is exactly the case where individual steps differ. */
    mode: processMode('mode').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    /** Human-readable trigger phrase: "When SO status → confirmed". */
    trigger: text('trigger'),
    /** Record type produced by this step, e.g. 'sales.delivery_order', 'fin.invoice'. */
    producesRecordType: varchar('produces_record_type', { length: 64 }),
    requiredRole: varchar('required_role', { length: 64 }),
    reversible: boolean('reversible').notNull().default(false),
    auditEvent: varchar('audit_event', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    processSeqUnique: uniqueIndex('flow_process_steps_process_seq_unique').on(
      t.processId,
      t.sequence,
    ),
    tenantIdx: index('flow_process_steps_tenant_id_idx').on(t.tenantId),
  }),
)

export type ProcessTemplate = typeof processTemplates.$inferSelect
export type NewProcessTemplate = typeof processTemplates.$inferInsert
export type ProcessStep = typeof processSteps.$inferSelect
export type NewProcessStep = typeof processSteps.$inferInsert
export type ProcessMode = (typeof processMode.enumValues)[number]
export type StepKind = (typeof stepKind.enumValues)[number]
