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

export const docSchema = pgSchema('doc')

// ── Enums ─────────────────────────────────────────────────────────────────────

export const docStatus = pgEnum('doc_status', [
  'draft',
  'active',
  'expired',
  'terminated',
])

export const docType = pgEnum('doc_type', [
  'contract',
  'nda',
  'mou',
  'agreement',
  'po',
  'invoice',
  'permit',
  'other',
])

// ── Documents ─────────────────────────────────────────────────────────────────

export const documents = docSchema.table('documents', {
  id:         uuid('id').primaryKey().defaultRandom(),
  tenantId:   uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  docNumber:  varchar('doc_number', { length: 32 }).notNull(),
  title:      varchar('title', { length: 400 }).notNull(),
  type:       docType('type').notNull().default('contract'),
  status:     docStatus('status').notNull().default('draft'),
  contactId:  uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  partyName:  varchar('party_name', { length: 200 }),
  startDate:  date('start_date'),
  expiryDate: date('expiry_date'),
  value:      integer('value').notNull().default(0),
  fileUrl:    text('file_url'),
  notes:      text('notes'),
  createdBy:  uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
  updatedAt:  timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  tenantIdx:      index('doc_docs_tenant_idx').on(t.tenantId),
  tenantStatusIdx: index('doc_docs_tenant_status_idx').on(t.tenantId, t.status),
}))

export type Document = typeof documents.$inferSelect
export type DocStatus = (typeof docStatus.enumValues)[number]
export type DocType = (typeof docType.enumValues)[number]
