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
} from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { users } from './users'
import { contacts } from './contacts'
import { accounts } from './fin'
import { products } from './inv'

export const proc = pgSchema('proc')

// ── Enums ─────────────────────────────────────────────────────────────────────

export const poStatus = pgEnum('proc_po_status', [
  'draft',
  'confirmed',
  'received',
  'billed',
  'cancelled',
])

// ── Purchase Orders ───────────────────────────────────────────────────────────

export const purchaseOrders = proc.table('purchase_orders', {
  id:           uuid('id').primaryKey().defaultRandom(),
  tenantId:     uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  poNumber:     varchar('po_number', { length: 32 }).notNull(),
  status:       poStatus('status').notNull().default('draft'),
  contactId:    uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  vendorName:   varchar('vendor_name', { length: 200 }).notNull(),
  date:         date('date').notNull(),
  expectedDate: date('expected_date'),
  notes:        text('notes'),
  billId:       uuid('bill_id'),    // populated after createBillFromPO
  createdBy:    uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
  updatedAt:    timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  tenantIdx:       index('proc_po_tenant_idx').on(t.tenantId),
  tenantStatusIdx: index('proc_po_tenant_status_idx').on(t.tenantId, t.status),
}))

export type PurchaseOrder = typeof purchaseOrders.$inferSelect
export type PoStatus = (typeof poStatus.enumValues)[number]

// ── PO Lines ──────────────────────────────────────────────────────────────────

export const poLines = proc.table('po_lines', {
  id:           uuid('id').primaryKey().defaultRandom(),
  tenantId:     uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  poId:         uuid('po_id').notNull().references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  productId:    uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  productType:  varchar('product_type', { length: 20 }),  // snapshot at PO time
  description:  varchar('description', { length: 500 }).notNull(),
  qty:          integer('qty').notNull(),
  unitPrice:    integer('unit_price').notNull(),
  accountId:    uuid('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  taxIds:       text('tax_ids').array().notNull().default([]),
  receivedQty:  integer('received_qty').notNull().default(0),
}, (t) => ({
  poIdx: index('proc_pol_po_idx').on(t.poId),
}))

export type PoLine = typeof poLines.$inferSelect
