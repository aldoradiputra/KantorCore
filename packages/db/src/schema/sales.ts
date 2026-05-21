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
import { accounts } from './fin'
import { products } from './inv'

export const salesSchema = pgSchema('sales')

// ── Enums ─────────────────────────────────────────────────────────────────────

export const soStatus = pgEnum('so_status', [
  'quotation',
  'confirmed',
  'done',
  'cancelled',
])

// ── Sales Orders ──────────────────────────────────────────────────────────────

export const salesOrders = salesSchema.table('sales_orders', {
  id:           uuid('id').primaryKey().defaultRandom(),
  tenantId:     uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  soNumber:     varchar('so_number', { length: 32 }).notNull(),
  status:       soStatus('status').notNull().default('quotation'),
  contactId:    uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  customerName: varchar('customer_name', { length: 200 }).notNull(),
  date:         date('date').notNull(),
  expiryDate:   date('expiry_date'),
  notes:        text('notes'),
  invoiceId:    uuid('invoice_id'),
  createdBy:    uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  tenantIdx:       index('sales_so_tenant_idx').on(t.tenantId),
  tenantStatusIdx: index('sales_so_tenant_status_idx').on(t.tenantId, t.status),
}))

export type SalesOrder = typeof salesOrders.$inferSelect
export type SoStatus = (typeof soStatus.enumValues)[number]

// ── SO Lines ──────────────────────────────────────────────────────────────────

export const soLines = salesSchema.table('so_lines', {
  id:           uuid('id').primaryKey().defaultRandom(),
  tenantId:     uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  soId:         uuid('so_id').notNull().references(() => salesOrders.id, { onDelete: 'cascade' }),
  productId:    uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  productType:  varchar('product_type', { length: 20 }),
  description:  varchar('description', { length: 500 }).notNull(),
  qty:          integer('qty').notNull(),
  unitPrice:    integer('unit_price').notNull(),
  accountId:    uuid('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  taxIds:       text('tax_ids').array().notNull().default([]),
  deliveredQty: integer('delivered_qty').notNull().default(0),
}, (t) => ({
  soIdx: index('sales_sol_so_idx').on(t.soId),
}))

export type SoLine = typeof soLines.$inferSelect
