import {
  pgSchema,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  pgEnum,
  index,
  uniqueIndex,
  integer,
  bigint,
  boolean,
  smallint,
  numeric,
} from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { users } from './users'
import { contacts } from './contacts'
import { accounts } from './fin'
import { products, productVariants, productPackagings, stockLocations, uom } from './inv'
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
  id:                 uuid('id').primaryKey().defaultRandom(),
  tenantId:           uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  soNumber:           varchar('so_number', { length: 32 }).notNull(),
  status:             soStatus('status').notNull().default('quotation'),
  contactId:          uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
  customerName:       varchar('customer_name', { length: 200 }).notNull(),
  customerReference:  varchar('customer_reference', { length: 64 }),
  date:               date('date').notNull(),
  expiryDate:         date('expiry_date'),
  notes:              text('notes'),
  invoiceId:          uuid('invoice_id'),
  dpInvoiceId:        uuid('dp_invoice_id'),
  teamId:             uuid('team_id').references(() => salesTeams.id, { onDelete: 'set null' }),
  assignedTo:         uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  dealId:             uuid('deal_id').references(() => deals.id, { onDelete: 'set null' }),
  fiscalPositionId:   uuid('fiscal_position_id'),
  incoterm:           varchar('incoterm', { length: 8 }),
  // Commercial
  subtotalAmount:     bigint('subtotal_amount', { mode: 'number' }).notNull().default(0),
  discountAmount:     bigint('discount_amount', { mode: 'number' }).notNull().default(0),
  taxAmount:          bigint('tax_amount', { mode: 'number' }).notNull().default(0),
  totalAmount:        bigint('total_amount', { mode: 'number' }).notNull().default(0),
  downPaymentPct:     smallint('down_payment_pct'),
  downPaymentAmount:  bigint('down_payment_amount', { mode: 'number' }),
  paymentTerms:       varchar('payment_terms', { length: 50 }),
  paymentDueDate:     date('payment_due_date'),
  // UTM (carried from CRM deal or set manually)
  utmSource:          varchar('utm_source', { length: 200 }),
  utmMedium:          varchar('utm_medium', { length: 200 }),
  utmCampaign:        varchar('utm_campaign', { length: 200 }),
  // Signature
  requiresSignature:  boolean('requires_signature').notNull().default(false),
  signedAt:           timestamp('signed_at'),
  signedByName:       varchar('signed_by_name', { length: 200 }),
  signedByIp:         varchar('signed_by_ip', { length: 45 }),
  signatureToken:     varchar('signature_token', { length: 64 }),
  // Approval state machine
  approvalState:      varchar('approval_state', { length: 20 }).notNull().default('none'),
  approvalRequiredBy: uuid('approval_required_by').references(() => users.id, { onDelete: 'set null' }),
  // Project link
  projectId:          uuid('project_id'),
  confirmedAt:        timestamp('confirmed_at'),
  createdBy:          uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt:          timestamp('created_at').notNull().defaultNow(),
  updatedAt:          timestamp('updated_at').notNull().defaultNow(),
  deletedAt:          timestamp('deleted_at'),
}, (t) => ({
  tenantIdx:       index('sales_so_tenant_idx').on(t.tenantId),
  tenantStatusIdx: index('sales_so_tenant_status_idx').on(t.tenantId, t.status),
  teamIdx:         index('sales_so_team_idx').on(t.teamId),
  assignedIdx:     index('sales_so_assigned_idx').on(t.assignedTo),
  dealIdx:         index('sales_so_deal_idx').on(t.dealId),
  dateIdx:         index('sales_so_date_idx').on(t.tenantId, t.date),
  sigTokenIdx:     uniqueIndex('sales_so_sig_token_idx').on(t.signatureToken),
}))

export type SalesOrder = typeof salesOrders.$inferSelect
export type SoStatus = (typeof soStatus.enumValues)[number]

// ── SO Lines ──────────────────────────────────────────────────────────────────

export const soLines = salesSchema.table('so_lines', {
  id:                uuid('id').primaryKey().defaultRandom(),
  tenantId:          uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  soId:              uuid('so_id').notNull().references(() => salesOrders.id, { onDelete: 'cascade' }),
  productId:         uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  productVariantId:  uuid('product_variant_id').references(() => productVariants.id, { onDelete: 'set null' }),
  productType:       varchar('product_type', { length: 20 }),
  description:       varchar('description', { length: 500 }).notNull(),
  qty:               integer('qty').notNull(),
  uomId:             uuid('uom_id').references(() => uom.id, { onDelete: 'set null' }),
  packagingId:       uuid('packaging_id').references(() => productPackagings.id, { onDelete: 'set null' }),
  warehouseId:       uuid('warehouse_id').references(() => stockLocations.id, { onDelete: 'set null' }),
  unitPrice:         integer('unit_price').notNull(),
  discountPct:       numeric('discount_pct', { precision: 5, scale: 2 }).notNull().default('0'),
  accountId:         uuid('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  taxIds:            text('tax_ids').array().notNull().default([]),
  // Three-way matching
  deliveredQty:      integer('delivered_qty').notNull().default(0),
  invoicedQty:       integer('invoiced_qty').notNull().default(0),
  // Recurring (subscription) support on the same line model
  recurringInterval: varchar('recurring_interval', { length: 20 }),
  recurringCount:    smallint('recurring_count'),
  nextBillingDate:   date('next_billing_date'),
  lineSequence:      smallint('line_sequence').notNull().default(0),
}, (t) => ({
  soIdx:        index('sales_sol_so_idx').on(t.soId),
  warehouseIdx: index('sales_sol_warehouse_idx').on(t.warehouseId),
  variantIdx:   index('sales_sol_variant_idx').on(t.productVariantId),
  recurringIdx: index('sales_sol_recurring_idx').on(t.nextBillingDate),
}))

export type SoLine = typeof soLines.$inferSelect
export type RecurringInterval = 'monthly' | 'quarterly' | 'annual'

// ── Settings (per tenant) ─────────────────────────────────────────────────────

export const salesSettings = salesSchema.table('settings', {
  tenantId:                uuid('tenant_id').primaryKey().references(() => tenants.id, { onDelete: 'cascade' }),
  soNumberPrefix:          varchar('so_number_prefix', { length: 20 }).notNull().default('SO'),
  soNumberFormat:          varchar('so_number_format', { length: 50 }).notNull().default('{prefix}/{year}/{seq:0000}'),
  defaultTaxRate:          smallint('default_tax_rate').notNull().default(11),
  taxInclusive:            boolean('tax_inclusive').notNull().default(false),
  defaultPaymentTerms:     varchar('default_payment_terms', { length: 50 }).notNull().default('Net 30'),
  defaultCurrency:         varchar('default_currency', { length: 3 }).notNull().default('IDR'),
  quoteValidityDays:       smallint('quote_validity_days').notNull().default(30),
  autoCreateInvoice:       boolean('auto_create_invoice').notNull().default(false),
  autoInvoiceOnPayment:    boolean('auto_invoice_on_payment').notNull().default(false),
  invoicePolicy:           varchar('invoice_policy', { length: 20 }).notNull().default('ordered'),
  discountApprovalPct:     smallint('discount_approval_pct').notNull().default(15),
  defaultIncoterm:         varchar('default_incoterm', { length: 8 }),
  defaultFiscalPositionId: uuid('default_fiscal_position_id'),
  createdAt:               timestamp('created_at').notNull().defaultNow(),
  updatedAt:               timestamp('updated_at').notNull().defaultNow(),
})

export type SalesSettings = typeof salesSettings.$inferSelect
export type NewSalesSettings = typeof salesSettings.$inferInsert

// ── Fiscal Positions ─────────────────────────────────────────────────────────

export const fiscalPositions = salesSchema.table('fiscal_positions', {
  id:           uuid('id').primaryKey().defaultRandom(),
  tenantId:     uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name:         varchar('name', { length: 128 }).notNull(),
  description:  text('description'),
  autoApply:    boolean('auto_apply').notNull().default(false),
  countryCode:  varchar('country_code', { length: 3 }),
  vatRequired:  boolean('vat_required'),
  isActive:     boolean('is_active').notNull().default(true),
  createdAt:    timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  tenantIdx: index('sales_fp_tenant_idx').on(t.tenantId),
}))

export type FiscalPosition = typeof fiscalPositions.$inferSelect

export const fiscalPositionTaxMaps = salesSchema.table('fiscal_position_tax_maps', {
  id:                uuid('id').primaryKey().defaultRandom(),
  fiscalPositionId:  uuid('fiscal_position_id').notNull().references(() => fiscalPositions.id, { onDelete: 'cascade' }),
  sourceTaxId:       uuid('source_tax_id').notNull(),
  targetTaxId:       uuid('target_tax_id'),
}, (t) => ({
  uniq: uniqueIndex('sales_fp_tax_map_uniq').on(t.fiscalPositionId, t.sourceTaxId),
}))

export type FiscalPositionTaxMap = typeof fiscalPositionTaxMaps.$inferSelect

// ── Commission Rules & Entries ───────────────────────────────────────────────

export const commissionRules = salesSchema.table('commission_rules', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  tenantId:           uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name:               varchar('name', { length: 128 }).notNull(),
  basis:              varchar('basis', { length: 20 }).notNull().default('revenue'),
  ratePct:            numeric('rate_pct', { precision: 5, scale: 2 }).notNull(),
  userId:             uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  teamId:             uuid('team_id').references(() => salesTeams.id, { onDelete: 'cascade' }),
  productCategoryId:  uuid('product_category_id'),
  triggerEvent:       varchar('trigger_event', { length: 20 }).notNull().default('invoice_paid'),
  isActive:           boolean('is_active').notNull().default(true),
  priority:           smallint('priority').notNull().default(0),
  createdAt:          timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  tenantIdx: index('sales_comm_tenant_idx').on(t.tenantId),
  userIdx:   index('sales_comm_user_idx').on(t.userId),
}))

export type CommissionRule = typeof commissionRules.$inferSelect

export const commissionEntries = salesSchema.table('commission_entries', {
  id:                uuid('id').primaryKey().defaultRandom(),
  tenantId:          uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  ruleId:            uuid('rule_id').notNull().references(() => commissionRules.id, { onDelete: 'restrict' }),
  soId:              uuid('so_id').references(() => salesOrders.id, { onDelete: 'set null' }),
  userId:            uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  basisAmount:       bigint('basis_amount', { mode: 'number' }).notNull(),
  commissionAmount:  bigint('commission_amount', { mode: 'number' }).notNull(),
  earnedAt:          timestamp('earned_at').notNull().defaultNow(),
  paidAt:            timestamp('paid_at'),
  notes:             text('notes'),
}, (t) => ({
  userIdx: index('sales_comm_entry_user_idx').on(t.userId, t.earnedAt),
  soIdx:   index('sales_comm_entry_so_idx').on(t.soId),
}))

export type CommissionEntry = typeof commissionEntries.$inferSelect
