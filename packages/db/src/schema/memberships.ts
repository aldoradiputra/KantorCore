import { uuid, timestamp, pgEnum, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { platform, tenants } from './tenants'
import { users } from './users'

/**
 * Per ADR-003 (RBAC baseline):
 * - owner   — full control, billing, can delete the workspace
 * - admin   — full data + settings; cannot delete the workspace or change billing
 * - member  — module-scoped permissions; the default for invited users
 *
 * Finer-grained per-module permissions live in module-specific tables once
 * those modules ship (Phase 11+).
 */
export const membershipRole = pgEnum('membership_role', ['owner', 'admin', 'member'])

/**
 * Join table between users and tenants. A user has one membership row per
 * tenant they belong to; the role applies workspace-wide.
 *
 * When a user signs up via the standard flow, exactly one tenant is
 * provisioned and the user gets an owner membership for it.
 */
export const memberships = platform.table(
  'memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    role: membershipRole('role').notNull().default('member'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userTenantUnique: uniqueIndex('memberships_user_tenant_unique').on(t.userId, t.tenantId),
    tenantIdx: index('memberships_tenant_id_idx').on(t.tenantId),
  }),
)

export type Membership = typeof memberships.$inferSelect
export type NewMembership = typeof memberships.$inferInsert
