import { pgSchema, uuid, text, jsonb, boolean, timestamp, index } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { users } from './users'

const trigSchema = pgSchema('trig')

export const triggerEvent = trigSchema.enum('trigger_event', [
  'invoice.confirmed',
  'invoice.paid',
  'bill.confirmed',
  'bill.paid',
  'po.confirmed',
  'po.received',
  'so.confirmed',
  'so.done',
  'deal.won',
  'deal.lost',
  'deal.stage_changed',
  'contact.created',
  'employee.created',
  'document.expiring_soon',
  'import.completed',
])

export const triggerAction = trigSchema.enum('trigger_action', [
  'chat_message',
  'webhook',
])

export const triggerStatus = trigSchema.enum('trigger_status', [
  'active',
  'inactive',
])

export const triggerRules = trigSchema.table(
  'trigger_rules',
  {
    id:          uuid('id').primaryKey().defaultRandom(),
    tenantId:    uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    name:        text('name').notNull(),
    description: text('description'),
    event:       triggerEvent('event').notNull(),
    action:      triggerAction('action').notNull(),
    config:      jsonb('config').notNull().default({}),
    status:      triggerStatus('status').notNull().default('active'),
    createdBy:   uuid('created_by').references(() => users.id),
    createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt:   timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantEventIdx: index('trig_rules_tenant_event_idx').on(t.tenantId, t.event, t.status),
  }),
)

export const triggerLogs = trigSchema.table(
  'trigger_logs',
  {
    id:       uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    ruleId:   uuid('rule_id').notNull().references(() => triggerRules.id, { onDelete: 'cascade' }),
    event:    triggerEvent('event').notNull(),
    payload:  jsonb('payload'),
    ok:       boolean('ok').notNull(),
    response: text('response'),
    firedAt:  timestamp('fired_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantRuleIdx: index('trig_logs_tenant_rule_idx').on(t.tenantId, t.ruleId, t.firedAt),
  }),
)

export type TriggerEvent  = (typeof triggerEvent.enumValues)[number]
export type TriggerAction = (typeof triggerAction.enumValues)[number]
export type TriggerStatus = (typeof triggerStatus.enumValues)[number]
export type TriggerRule   = typeof triggerRules.$inferSelect
export type TriggerLog    = typeof triggerLogs.$inferSelect
