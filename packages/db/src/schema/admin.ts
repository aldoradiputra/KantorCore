import {
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { platform, tenants } from './tenants'
import { users } from './users'

/**
 * Workspace-level user groups. Used for mentions, notification routing,
 * approval chains, and access policy grouping.
 *
 * email_alias: short slug (e.g. "hr", "finance") that eventually maps to a
 * group email address when IS-EMAIL ships. Nullable until needed.
 */
export const groups = platform.table(
  'groups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 128 }).notNull(),
    description: text('description'),
    emailAlias: varchar('email_alias', { length: 128 }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('groups_tenant_id_idx').on(t.tenantId),
    tenantNameUnique: uniqueIndex('groups_tenant_name_unique').on(t.tenantId, t.name),
  }),
)

export const groupMembers = platform.table(
  'group_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    groupUserUnique: uniqueIndex('group_members_group_user_unique').on(t.groupId, t.userId),
    groupIdx: index('group_members_group_id_idx').on(t.groupId),
    tenantIdx: index('group_members_tenant_id_idx').on(t.tenantId),
  }),
)

/**
 * Tenant-scoped user directory profile — extends platform.users with
 * org-specific fields (department, job title, manager, employee ID, phone).
 * One row per (tenant, user) pair; upserted when the admin edits directory.
 *
 * These feed into HR cost centers, payroll department grouping, and the
 * org chart view.
 */
export const directoryProfiles = platform.table(
  'directory_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    department: varchar('department', { length: 128 }),
    jobTitle: varchar('job_title', { length: 128 }),
    managerId: uuid('manager_id').references(() => users.id, { onDelete: 'set null' }),
    employeeId: varchar('employee_id', { length: 64 }),
    phone: varchar('phone', { length: 32 }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantUserUnique: uniqueIndex('directory_profiles_tenant_user_unique').on(
      t.tenantId,
      t.userId,
    ),
    tenantIdx: index('directory_profiles_tenant_id_idx').on(t.tenantId),
  }),
)

/**
 * Per-tenant security policy. One row per tenant (upserted on save).
 * Defaults are permissive; admins tighten for compliance.
 *
 * require2fa: when true, any member without TOTP enabled is blocked at
 *   the two-step challenge screen until they enroll.
 * sessionTimeoutHours: idle session expiry; 720h = 30 days default.
 * ipAllowlist: empty array = no restriction. Entries are CIDR strings
 *   (e.g. "203.0.113.0/24"). Applied at the requireSession middleware.
 */
export const workspaceSecurityPolicy = platform.table(
  'workspace_security_policy',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .unique()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    require2fa: boolean('require_2fa').notNull().default(false),
    passwordMinLength: integer('password_min_length').notNull().default(8),
    sessionTimeoutHours: integer('session_timeout_hours').notNull().default(720),
    ipAllowlist: text('ip_allowlist').array().notNull().default([]),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => ({
    tenantIdx: index('workspace_security_policy_tenant_id_idx').on(t.tenantId),
  }),
)

export type Group = typeof groups.$inferSelect
export type NewGroup = typeof groups.$inferInsert
export type GroupMember = typeof groupMembers.$inferSelect
export type DirectoryProfile = typeof directoryProfiles.$inferSelect
export type WorkspaceSecurityPolicy = typeof workspaceSecurityPolicy.$inferSelect
