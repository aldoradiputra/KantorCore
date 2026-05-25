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
  boolean,
  smallint,
  bigint,
  jsonb,
  unique,
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

export const assignmentRuleType = pgEnum('assignment_rule_type', [
  'round_robin',
  'load_balanced',
  'rule_based',
  'manual',
])

export const assignmentFrequency = pgEnum('assignment_frequency', [
  'daily',
  'weekly',
  'monthly',
])

export const leadStatus = pgEnum('lead_status', [
  'new',
  'contacted',
  'qualified',
  'disqualified',
  'converted',
])

export const recurringType = pgEnum('recurring_type', [
  'one_time',
  'monthly',
  'quarterly',
  'annual',
])

// ── Sales Teams ───────────────────────────────────────────────────────────────

export const salesTeams = crmSchema.table('sales_teams', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  tenantId:            uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name:                varchar('name', { length: 200 }).notNull(),
  description:         text('description'),
  leaderId:            uuid('leader_id').references(() => users.id, { onDelete: 'set null' }),
  targetRevenue:       bigint('target_revenue', { mode: 'number' }).notNull().default(0),
  targetDealCount:     integer('target_deal_count').notNull().default(0),
  assignmentFrequency: assignmentFrequency('assignment_frequency').notNull().default('weekly'),
  active:              boolean('active').notNull().default(true),
  createdAt:           timestamp('created_at').notNull().defaultNow(),
  updatedAt:           timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  tenantIdx: index('crm_sales_teams_tenant_idx').on(t.tenantId),
}))

export type SalesTeam = typeof salesTeams.$inferSelect
export type NewSalesTeam = typeof salesTeams.$inferInsert

// ── Sales Team Members ────────────────────────────────────────────────────────

export const salesTeamMembers = crmSchema.table('sales_team_members', {
  id:                    uuid('id').primaryKey().defaultRandom(),
  teamId:                uuid('team_id').notNull().references(() => salesTeams.id, { onDelete: 'cascade' }),
  userId:                uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role:                  varchar('role', { length: 20 }).notNull().default('member'),
  personalTargetRevenue: bigint('personal_target_revenue', { mode: 'number' }),
  active:                boolean('active').notNull().default(true),
  joinedAt:              timestamp('joined_at').notNull().defaultNow(),
}, (t) => ({
  teamIdx:      index('crm_team_members_team_idx').on(t.teamId),
  userIdx:      index('crm_team_members_user_idx').on(t.userId),
  teamUserUniq: unique('crm_team_members_team_user_uniq').on(t.teamId, t.userId),
}))

export type SalesTeamMember = typeof salesTeamMembers.$inferSelect

// ── Assignment Rules ──────────────────────────────────────────────────────────

export const assignmentRules = crmSchema.table('assignment_rules', {
  id:                uuid('id').primaryKey().defaultRandom(),
  tenantId:          uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  teamId:            uuid('team_id').notNull().references(() => salesTeams.id, { onDelete: 'cascade' }),
  name:              varchar('name', { length: 200 }).notNull(),
  ruleType:          assignmentRuleType('rule_type').notNull().default('round_robin'),
  conditions:        jsonb('conditions').notNull().default({}),
  eligibleMemberIds: jsonb('eligible_member_ids').notNull().default([]),
  isActive:          boolean('is_active').notNull().default(true),
  lastTriggeredAt:   timestamp('last_triggered_at'),
  createdBy:         uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt:         timestamp('created_at').notNull().defaultNow(),
  updatedAt:         timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  teamIdx: index('crm_assignment_rules_team_idx').on(t.teamId),
}))

export type AssignmentRule = typeof assignmentRules.$inferSelect

// ── Leads ─────────────────────────────────────────────────────────────────────

export const leads = crmSchema.table('leads', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  tenantId:           uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  leadNumber:         varchar('lead_number', { length: 32 }).notNull(),
  firstName:          varchar('first_name', { length: 100 }).notNull(),
  lastName:           varchar('last_name', { length: 100 }),
  email:              varchar('email', { length: 300 }),
  phone:              varchar('phone', { length: 50 }),
  companyName:        varchar('company_name', { length: 200 }),
  jobTitle:           varchar('job_title', { length: 200 }),
  industry:           varchar('industry', { length: 100 }),
  employeeCount:      integer('employee_count'),
  location:           varchar('location', { length: 200 }),
  utmSource:          varchar('utm_source', { length: 200 }),
  utmMedium:          varchar('utm_medium', { length: 200 }),
  utmCampaign:        varchar('utm_campaign', { length: 200 }),
  tags:               jsonb('tags').notNull().default([]),
  leadStatus:         leadStatus('lead_status').notNull().default('new'),
  assignedTo:         uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  assignedTeamId:     uuid('assigned_team_id').references(() => salesTeams.id, { onDelete: 'set null' }),
  assignedAt:         timestamp('assigned_at'),
  assignmentRuleId:   uuid('assignment_rule_id').references(() => assignmentRules.id, { onDelete: 'set null' }),
  convertedToDealId:  uuid('converted_to_deal_id'),
  convertedAt:        timestamp('converted_at'),
  notes:              text('notes'),
  createdBy:          uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt:          timestamp('created_at').notNull().defaultNow(),
  updatedAt:          timestamp('updated_at').notNull().defaultNow(),
  deletedAt:          timestamp('deleted_at'),
}, (t) => ({
  tenantIdx:   index('crm_leads_tenant_idx').on(t.tenantId),
  assignedIdx: index('crm_leads_assigned_idx').on(t.assignedTo),
  teamIdx:     index('crm_leads_team_idx').on(t.assignedTeamId),
  statusIdx:   index('crm_leads_status_idx').on(t.tenantId, t.leadStatus),
}))

export type Lead = typeof leads.$inferSelect
export type LeadStatus = (typeof leadStatus.enumValues)[number]

// ── Deals ─────────────────────────────────────────────────────────────────────

export const deals = crmSchema.table('deals', {
  id:                    uuid('id').primaryKey().defaultRandom(),
  tenantId:              uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  dealNumber:            varchar('deal_number', { length: 32 }).notNull(),
  title:                 varchar('title', { length: 300 }).notNull(),
  stage:                 dealStage('stage').notNull().default('lead'),
  probability:           smallint('probability').notNull().default(20),
  contactId:             uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  contactName:           varchar('contact_name', { length: 200 }),
  expectedValue:         integer('expected_value').notNull().default(0),
  expectedClose:         date('expected_close'),
  teamId:                uuid('team_id').references(() => salesTeams.id, { onDelete: 'set null' }),
  utmSource:             varchar('utm_source', { length: 200 }),
  utmMedium:             varchar('utm_medium', { length: 200 }),
  utmCampaign:           varchar('utm_campaign', { length: 200 }),
  isRecurring:           boolean('is_recurring').notNull().default(false),
  recurringType:         recurringType('recurring_type'),
  recurringAmountMonthly: bigint('recurring_amount_monthly', { mode: 'number' }),
  notes:                 text('notes'),
  closeReason:           text('close_reason'),
  soId:                  uuid('so_id'),
  assignedTo:            uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  createdBy:             uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt:             timestamp('created_at').notNull().defaultNow(),
  updatedAt:             timestamp('updated_at').notNull().defaultNow(),
  deletedAt:             timestamp('deleted_at'),
}, (t) => ({
  tenantIdx:      index('crm_deals_tenant_idx').on(t.tenantId),
  tenantStageIdx: index('crm_deals_tenant_stage_idx').on(t.tenantId, t.stage),
  teamIdx:        index('crm_deals_team_idx').on(t.teamId),
  assignedToIdx:  index('crm_deals_assigned_to_idx').on(t.assignedTo),
  stageDateIdx:   index('crm_deals_stage_date_idx').on(t.tenantId, t.stage, t.expectedClose),
}))

export type Deal = typeof deals.$inferSelect
export type DealStage = (typeof dealStage.enumValues)[number]
export type RecurringType = (typeof recurringType.enumValues)[number]

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
