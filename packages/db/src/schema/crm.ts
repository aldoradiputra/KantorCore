import {
  pgSchema,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  pgEnum,
  index,
  integer,
} from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { users } from './users'
import { contacts } from './contacts'

export const crmSchema = pgSchema('crm')

// ── Enums ─────────────────────────────────────────────────────────────────────

export const dealStage = pgEnum('deal_stage', [
  'lead',
  'qualified',
  'proposal',
  'negotiation',
  'won',
  'lost',
])

export const activityType = pgEnum('activity_type', [
  'note',
  'call',
  'email',
  'meeting',
])

// ── Deals ─────────────────────────────────────────────────────────────────────

export const deals = crmSchema.table('deals', {
  id:            uuid('id').primaryKey().defaultRandom(),
  tenantId:      uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  dealNumber:    varchar('deal_number', { length: 32 }).notNull(),
  title:         varchar('title', { length: 300 }).notNull(),
  stage:         dealStage('stage').notNull().default('lead'),
  contactId:     uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  contactName:   varchar('contact_name', { length: 200 }),
  expectedValue: integer('expected_value').notNull().default(0),
  expectedClose: date('expected_close'),
  notes:         text('notes'),
  soId:          uuid('so_id'),
  assignedTo:    uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  createdBy:     uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt:     timestamp('created_at').notNull().defaultNow(),
  updatedAt:     timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  tenantIdx:      index('crm_deals_tenant_idx').on(t.tenantId),
  tenantStageIdx: index('crm_deals_tenant_stage_idx').on(t.tenantId, t.stage),
}))

export type Deal = typeof deals.$inferSelect
export type DealStage = (typeof dealStage.enumValues)[number]

// ── Activities ────────────────────────────────────────────────────────────────

export const activities = crmSchema.table('activities', {
  id:        uuid('id').primaryKey().defaultRandom(),
  tenantId:  uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  dealId:    uuid('deal_id').notNull().references(() => deals.id, { onDelete: 'cascade' }),
  type:      activityType('type').notNull().default('note'),
  title:     varchar('title', { length: 300 }).notNull(),
  notes:     text('notes'),
  doneAt:    timestamp('done_at').notNull().defaultNow(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  dealIdx: index('crm_act_deal_idx').on(t.dealId),
}))

export type Activity = typeof activities.$inferSelect
export type ActivityType = (typeof activityType.enumValues)[number]
