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
  bigint,
  boolean,
  smallint,
} from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { users } from './users'
import { contacts } from './contacts'
import { accounts } from './fin'
import { products } from './inv'
import { salesTeams, deals } from './crm'

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
  id:             uuid('id').primaryKey().defaultRandom(),
  tenantId:       uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  soNumber:       varchar('so_number', { length: 32 }).notNull(),
  status:         soStatus('status').notNull().default('quotation'),
  contactId:      uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  customerName:   varchar('customer_name', { length: 200 }).notNull(),
  date:           date('date').notNull(),
  expiryDate:     date('expiry_date'),
  notes:          text('notes'),
  invoiceId:      uuid('invoice_id'),
  teamId:         uuid('team_id').references(() => salesTeams.id, { onDelete: 'set null' }),
  assignedTo:     uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  dealId:         uuid('deal_id').references(() => deals.id, { onDelete: 'set null' }),
  subtotalAmount: bigint('subtotal_amount', { mode: 'number' }).notNull().default(0),
  discountAmount: bigint('discount_amount', { mode: 'number' }).notNull().default(0),
  taxAmount:      bigint('tax_amount', { mode: 'number' }).notNull().default(0),
  totalAmount:    bigint('total_amount', { mode: 'number' }).notNull().default(0),
  paymentTerms:   varchar('payment_terms', { length: 50 }),
  paymentDueDate: date('payment_due_date'),
  confirmedAt:    timestamp('confirmed_at'),
  createdBy:      uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt:      timestamp('created_at').notNull().defaultNow(),
  updatedAt:      timestamp('updated_at').notNull().defaultNow(),
  deletedAt:      timestamp('deleted_at'),
}, (t) => ({
  tenantIdx:       index('sales_so_tenant_idx').on(t.tenantId),
  tenantStatusIdx: index('sales_so_tenant_status_idx').on(t.tenantId, t.status),
  teamIdx:         index('sales_so_team_idx').on(t.teamId),
  assignedIdx:     index('sales_so_assigned_idx').on(t.assignedTo),
  dealIdx:         index('sales_so_deal_idx').on(t.dealId),
  dateIdx:         index('sales_so_date_idx').on(t.tenantId, t.date),
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

// ── Settings (per tenant) ─────────────────────────────────────────────────────

export const salesSettings = salesSchema.table('settings', {
  tenantId:            uuid('tenant_id').primaryKey().references(() => tenants.id, { onDelete: 'cascade' }),
  soNumberPrefix:      varchar('so_number_prefix', { length: 20 }).notNull().default('SO'),
  soNumberFormat:      varchar('so_number_format', { length: 50 }).notNull().default('{prefix}/{year}/{seq:0000}'),
  defaultTaxRate:      smallint('default_tax_rate').notNull().default(11),
  taxInclusive:        boolean('tax_inclusive').notNull().default(false),
  defaultPaymentTerms: varchar('default_payment_terms', { length: 50 }).notNull().default('Net 30'),
  defaultCurrency:     varchar('default_currency', { length: 3 }).notNull().default('IDR'),
  quoteValidityDays:   smallint('quote_validity_days').notNull().default(30),
  autoCreateInvoice:   boolean('auto_create_invoice').notNull().default(false),
  discountApprovalPct: smallint('discount_approval_pct').notNull().default(15),
  createdAt:           timestamp('created_at').notNull().defaultNow(),
  updatedAt:           timestamp('updated_at').notNull().defaultNow(),
})

export type SalesSettings = typeof salesSettings.$inferSelect
export type NewSalesSettings = typeof salesSettings.$inferInsert
