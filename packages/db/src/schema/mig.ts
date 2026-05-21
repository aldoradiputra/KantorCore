import { pgSchema, uuid, timestamp, pgEnum, integer, jsonb } from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { users } from './users'

export const migSchema = pgSchema('mig')

export const importEntity = pgEnum('import_entity', [
  'contacts', 'products', 'accounts', 'vendors',
])

export const importStatus = pgEnum('import_status', [
  'pending', 'done', 'failed',
])

export const importJobs = migSchema.table('import_jobs', {
  id:        uuid('id').primaryKey().defaultRandom(),
  tenantId:  uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  entity:    importEntity('entity').notNull(),
  status:    importStatus('status').notNull().default('pending'),
  totalRows: integer('total_rows').notNull().default(0),
  imported:  integer('imported').notNull().default(0),
  failed:    integer('failed').notNull().default(0),
  errors:    jsonb('errors').notNull().default([]),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type ImportJob = typeof importJobs.$inferSelect
export type ImportEntity = (typeof importEntity.enumValues)[number]
export type ImportStatus = (typeof importStatus.enumValues)[number]
