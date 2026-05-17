import {
  pgSchema,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  integer,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { users } from './users'

/**
 * The `proj` schema holds IS-PROJ module tables. Per ADR-001, every table
 * carries `tenant_id` and is tenant-isolated. Same RLS-deferred pattern as
 * `chat` — explicit tenant_id filters in every query for now.
 */
export const proj = pgSchema('proj')

/**
 * Linear-style workflow states. Order matters for board column rendering;
 * keep the enum order matched to the UI grouping order.
 */
export const issueStatus = pgEnum('proj_issue_status', [
  'backlog',
  'todo',
  'in_progress',
  'in_review',
  'done',
  'cancelled',
])

export const issuePriority = pgEnum('proj_issue_priority', [
  'none',
  'low',
  'medium',
  'high',
  'urgent',
])

export const projects = proj.table(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    slug: varchar('slug', { length: 64 }).notNull(),
    /**
     * Short issue prefix (e.g. "KAN" for Kantr, "OPS" for Operations).
     * Combined with `issues.number` to form human-readable IDs: KAN-42.
     */
    key: varchar('key', { length: 8 }).notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    description: text('description'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantSlugUnique: uniqueIndex('proj_projects_tenant_slug_unique').on(t.tenantId, t.slug),
    tenantKeyUnique: uniqueIndex('proj_projects_tenant_key_unique').on(t.tenantId, t.key),
    tenantIdx: index('proj_projects_tenant_id_idx').on(t.tenantId),
  }),
)

export const issues = proj.table(
  'issues',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    /**
     * Per-project monotonically increasing issue number. Combined with the
     * project's `key` to form public IDs (e.g. KAN-42). Generated server-side
     * by counting current rows + 1; race-condition cleanup ships once we hit
     * concurrent issue creation in production.
     */
    number: integer('number').notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body'),
    status: issueStatus('status').notNull().default('backlog'),
    priority: issuePriority('priority').notNull().default('none'),
    assigneeId: uuid('assignee_id').references(() => users.id, { onDelete: 'set null' }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    projectNumberUnique: uniqueIndex('proj_issues_project_number_unique').on(
      t.projectId,
      t.number,
    ),
    // Hot read path: issues for one project, grouped by status.
    projectStatusIdx: index('proj_issues_project_status_idx').on(t.projectId, t.status),
    assigneeIdx: index('proj_issues_assignee_idx').on(t.assigneeId),
    tenantIdx: index('proj_issues_tenant_id_idx').on(t.tenantId),
  }),
)

export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type Issue = typeof issues.$inferSelect
export type NewIssue = typeof issues.$inferInsert
export type IssueStatus = (typeof issueStatus.enumValues)[number]
export type IssuePriority = (typeof issuePriority.enumValues)[number]
