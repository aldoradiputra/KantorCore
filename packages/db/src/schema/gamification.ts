import {
  pgSchema,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  pgEnum,
  index,
  boolean,
  smallint,
  numeric,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { users } from './users'
import { employees } from './hr'

/**
 * IS-HR Gamification — Challenges, Badges, Goal History.
 *
 * Challenges define performance goals. Badges are visual tokens awarded on
 * completion (auto) or manually by managers. Goal History feeds performance
 * reviews without depending on attendance data.
 */
export const gamify = pgSchema('gamify')

// ── Enums ─────────────────────────────────────────────────────────────────────

export const challengeMetricType = pgEnum('gamify_metric_type', [
  'revenue',
  'deals_closed',
  'tasks_completed',
  'training_hours',
  'custom',
])

export const employeeChallengeStatus = pgEnum('gamify_challenge_status', [
  'active',
  'completed',
  'failed',
  'cancelled',
])

export const goalResult = pgEnum('gamify_goal_result', [
  'achieved',
  'partially_achieved',
  'missed',
])

// ── Badges ────────────────────────────────────────────────────────────────────

export const badges = gamify.table(
  'badges',
  {
    id:          uuid('id').primaryKey().defaultRandom(),
    tenantId:    uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    name:        varchar('name', { length: 128 }).notNull(),
    icon:        varchar('icon', { length: 64 }).notNull().default('🏆'),  // emoji or icon token
    color:       varchar('color', { length: 7 }).notNull().default('#3B4FC4'),
    description: text('description'),
    isSystem:    boolean('is_system').notNull().default(false), // true = auto-awarded on challenge completion
    createdBy:   uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('badge_tenant_idx').on(t.tenantId),
  }),
)

export type Badge    = typeof badges.$inferSelect
export type NewBadge = typeof badges.$inferInsert

// ── Employee Badges (earned / manually awarded) ───────────────────────────────

export const employeeBadges = gamify.table(
  'employee_badges',
  {
    id:          uuid('id').primaryKey().defaultRandom(),
    tenantId:    uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    employeeId:  uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
    badgeId:     uuid('badge_id').notNull().references(() => badges.id, { onDelete: 'cascade' }),
    awardedBy:   uuid('awarded_by').references(() => users.id, { onDelete: 'set null' }),
    awardedAt:   timestamp('awarded_at', { withTimezone: true }).notNull().defaultNow(),
    reason:      text('reason'),
    // challengeId populated when auto-awarded; null when manually awarded
    challengeId: uuid('challenge_id'),
  },
  (t) => ({
    employeeIdx: index('emp_badge_employee_idx').on(t.employeeId),
    badgeIdx:    index('emp_badge_badge_idx').on(t.badgeId),
  }),
)

export type EmployeeBadge = typeof employeeBadges.$inferSelect

// ── Challenges / KPIs ─────────────────────────────────────────────────────────

export const challenges = gamify.table(
  'challenges',
  {
    id:           uuid('id').primaryKey().defaultRandom(),
    tenantId:     uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    title:        varchar('title', { length: 255 }).notNull(),
    description:  text('description'),
    metricType:   challengeMetricType('metric_type').notNull().default('custom'),
    targetValue:  numeric('target_value', { precision: 14, scale: 2 }).notNull(),
    targetDate:   date('target_date'),
    badgeId:      uuid('badge_id').references(() => badges.id, { onDelete: 'set null' }),
    isRepeatable: boolean('is_repeatable').notNull().default(false),
    isActive:     boolean('is_active').notNull().default(true),
    createdBy:    uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('challenge_tenant_idx').on(t.tenantId),
    activeIdx: index('challenge_active_idx').on(t.tenantId, t.isActive),
  }),
)

export type Challenge    = typeof challenges.$inferSelect
export type NewChallenge = typeof challenges.$inferInsert
export type ChallengeMetricType = (typeof challengeMetricType.enumValues)[number]

// ── Employee Challenge Enrollments ────────────────────────────────────────────

export const employeeChallenges = gamify.table(
  'employee_challenges',
  {
    id:              uuid('id').primaryKey().defaultRandom(),
    tenantId:        uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    employeeId:      uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
    challengeId:     uuid('challenge_id').notNull().references(() => challenges.id, { onDelete: 'cascade' }),
    currentProgress: numeric('current_progress', { precision: 14, scale: 2 }).notNull().default('0.00'),
    status:          employeeChallengeStatus('status').notNull().default('active'),
    completedAt:     timestamp('completed_at', { withTimezone: true }),
    assignedBy:      uuid('assigned_by').references(() => users.id, { onDelete: 'set null' }),
    assignedAt:      timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
    notes:           text('notes'),
  },
  (t) => ({
    employeeIdx:  index('emp_chall_employee_idx').on(t.employeeId),
    challengeIdx: index('emp_chall_challenge_idx').on(t.challengeId),
    statusIdx:    index('emp_chall_status_idx').on(t.tenantId, t.status),
    uniq:         uniqueIndex('emp_chall_uniq').on(t.employeeId, t.challengeId),
  }),
)

export type EmployeeChallenge       = typeof employeeChallenges.$inferSelect
export type NewEmployeeChallenge    = typeof employeeChallenges.$inferInsert
export type EmployeeChallengeStatus = (typeof employeeChallengeStatus.enumValues)[number]

// ── Goal History ──────────────────────────────────────────────────────────────

export const goalHistory = gamify.table(
  'goal_history',
  {
    id:              uuid('id').primaryKey().defaultRandom(),
    tenantId:        uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    employeeId:      uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
    challengeId:     uuid('challenge_id').references(() => challenges.id, { onDelete: 'set null' }),
    challengeTitle:  varchar('challenge_title', { length: 255 }).notNull(), // denormalized snapshot
    result:          goalResult('result').notNull(),
    period:          varchar('period', { length: 20 }).notNull(), // '2026-Q1' | '2026' | '2026-01'
    finalProgress:   numeric('final_progress', { precision: 14, scale: 2 }).notNull().default('0.00'),
    targetValue:     numeric('target_value', { precision: 14, scale: 2 }).notNull(),
    reviewNotes:     text('review_notes'),
    reviewedBy:      uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt:      timestamp('reviewed_at', { withTimezone: true }),
    recordedAt:      timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    employeeIdx: index('goal_hist_employee_idx').on(t.employeeId),
    periodIdx:   index('goal_hist_period_idx').on(t.tenantId, t.period),
  }),
)

export type GoalHistory    = typeof goalHistory.$inferSelect
export type NewGoalHistory = typeof goalHistory.$inferInsert
export type GoalResult     = (typeof goalResult.enumValues)[number]
