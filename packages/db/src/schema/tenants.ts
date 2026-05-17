import { pgSchema, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core'

/**
 * The `platform` schema holds workspace-wide tables that exist outside any
 * single tenant's data. Tenant routing, billing, audit, and provisioning
 * state all live here.
 */
export const platform = pgSchema('platform')

/**
 * Per ADR-001 (Multi-tenancy):
 * - `shared`    — tenant lives in the shared Postgres database with RLS scoping
 * - `dedicated` — tenant has its own Postgres database; db_url points to it
 *
 * Promotion path: shared → dedicated when a tenant crosses 500 employees,
 * signs an enterprise contract, or hits a regulatory isolation requirement.
 */
export const tenantDbMode = pgEnum('tenant_db_mode', ['shared', 'dedicated'])

/**
 * Per ADR-008 + ADR-010 (Pricing):
 * - rintis  — free tier, 5 seats, 1 agent slot
 * - tumbuh  — Rp 149k/seat, all Phase 1 modules, 3 agent slots
 * - pilih   — Rp 1.2M/module, unlimited seats, 10 agent slots/module
 * - penuh   — enterprise, custom, dedicated DB available
 */
export const tenantPlan = pgEnum('tenant_plan', ['rintis', 'tumbuh', 'pilih', 'penuh'])

export const tenantStatus = pgEnum('tenant_status', [
  'provisioning', // mid-signup, async job still running
  'active',
  'suspended',    // billing failure, manual intervention required
  'archived',     // tenant deleted, data retained for compliance window
])

/**
 * The root identity for every customer workspace. Every other tenant-scoped
 * table joins to this via tenant_id. Slug becomes the subdomain at signup
 * (e.g. `pt-maju-jaya` → pt-maju-jaya.kantr.com).
 */
export const tenants = platform.table('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 64 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  status: tenantStatus('status').notNull().default('provisioning'),
  plan: tenantPlan('plan').notNull().default('rintis'),
  dbMode: tenantDbMode('db_mode').notNull().default('shared'),
  dbUrl: text('db_url'), // null for shared; populated for dedicated
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Tenant = typeof tenants.$inferSelect
export type NewTenant = typeof tenants.$inferInsert
