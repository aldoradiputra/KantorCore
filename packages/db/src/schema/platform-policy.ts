import {
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { platform, tenants } from './tenants'
import { users } from './users'

/**
 * IS-PLAT Phase 5 — Policy engine + approvals.
 *
 * custom_roles      — tenant-defined roles beyond owner/admin/member
 * role_assignments  — user ↔ custom_role
 * policies          — declarative allow/deny rules per (resource, action, principal)
 * approvals         — generic approval requests typed to any resource
 */

// ── custom roles ────────────────────────────────────────────────────────────
export const customRoles = platform.table(
  'custom_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    key: varchar('key', { length: 64 }).notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    description: text('description'),
    isSystem: boolean('is_system').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantKeyUnique: uniqueIndex('platform_custom_roles_tenant_key_unique').on(t.tenantId, t.key),
  }),
)

// ── role assignments ───────────────────────────────────────────────────────
export const roleAssignments = platform.table(
  'role_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => customRoles.id, { onDelete: 'cascade' }),
    grantedBy: uuid('granted_by').references(() => users.id),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    unique: uniqueIndex('platform_role_assignments_unique').on(t.tenantId, t.userId, t.roleId),
    userIdx: index('platform_role_assignments_user_idx').on(t.tenantId, t.userId),
  }),
)

// ── policies ───────────────────────────────────────────────────────────────
export const policyEffect = pgEnum('platform_policy_effect', ['allow', 'deny'])

export const policyPrincipalType = pgEnum('platform_policy_principal_type', [
  'any',
  'membership_role',
  'custom_role',
  'user',
])

export const policies = platform.table(
  'policies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 128 }).notNull(),
    description: text('description'),
    resource: varchar('resource', { length: 128 }).notNull(),
    action: varchar('action', { length: 64 }).notNull(),
    effect: policyEffect('effect').notNull().default('allow'),
    principalType: policyPrincipalType('principal_type').notNull().default('any'),
    principalId: varchar('principal_id', { length: 128 }),
    conditions: jsonb('conditions').$type<Record<string, unknown>>().notNull().default({}),
    priority: integer('priority').notNull().default(100),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    resourceIdx: index('platform_policies_tenant_resource_idx').on(
      t.tenantId,
      t.resource,
      t.action,
      t.isActive,
    ),
  }),
)

// ── approvals ──────────────────────────────────────────────────────────────
export const approvalStatus = pgEnum('platform_approval_status', [
  'pending',
  'approved',
  'rejected',
  'cancelled',
])

export const approvals = platform.table(
  'approvals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    resourceType: varchar('resource_type', { length: 64 }).notNull(),
    resourceId: uuid('resource_id').notNull(),
    action: varchar('action', { length: 64 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    requesterId: uuid('requester_id').references(() => users.id),
    requiredRole: varchar('required_role', { length: 64 }),
    status: approvalStatus('status').notNull().default('pending'),
    decidedBy: uuid('decided_by').references(() => users.id),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    decisionNotes: text('decision_notes'),
    context: jsonb('context').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    statusIdx: index('platform_approvals_tenant_status_idx').on(
      t.tenantId,
      t.status,
      t.createdAt,
    ),
    resourceIdx: index('platform_approvals_resource_idx').on(
      t.tenantId,
      t.resourceType,
      t.resourceId,
    ),
  }),
)

export type CustomRole = typeof customRoles.$inferSelect
export type NewCustomRole = typeof customRoles.$inferInsert
export type RoleAssignment = typeof roleAssignments.$inferSelect
export type NewRoleAssignment = typeof roleAssignments.$inferInsert
export type Policy = typeof policies.$inferSelect
export type NewPolicy = typeof policies.$inferInsert
export type PolicyEffect = (typeof policyEffect.enumValues)[number]
export type PolicyPrincipalType = (typeof policyPrincipalType.enumValues)[number]
export type Approval = typeof approvals.$inferSelect
export type NewApproval = typeof approvals.$inferInsert
export type ApprovalStatus = (typeof approvalStatus.enumValues)[number]
