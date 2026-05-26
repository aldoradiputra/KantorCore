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
  bigint,
  integer,
  boolean,
  numeric,
} from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { users } from './users'

/**
 * IS-FIN — Finance & Accounting (Phase 1).
 *
 * Double-entry bookkeeping: Chart of Accounts → Journal Entries + Lines.
 * Customer Invoices (AR) and Vendor Bills (AP) are higher-level documents
 * that post journal entries on confirmation.
 *
 * All monetary amounts stored in IDR (Rupiah, no decimal units) as bigint.
 */
export const fin = pgSchema('fin')

// ── Enums ─────────────────────────────────────────────────────────────────────

export const finAccountType = pgEnum('fin_account_type', [
  'asset',
  'liability',
  'equity',
  'revenue',
  'expense',
])

export const finEntryStatus = pgEnum('fin_entry_status', [
  'draft',
  'posted',
  'reversed',
])

export const finDocStatus = pgEnum('fin_doc_status', [
  'draft',
  'confirmed',
  'paid',
  'cancelled',
])

// ── Chart of Accounts ─────────────────────────────────────────────────────────

export const accounts = fin.table('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 20 }).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  type: finAccountType('type').notNull(),
  parentId: uuid('parent_id'),
  isActive: boolean('is_active').notNull().default(true),
  isReconcilable: boolean('is_reconcilable').notNull().default(false),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  tenantCodeUnique: uniqueIndex('fin_acct_tenant_code_uniq').on(t.tenantId, t.code),
  tenantIdx: index('fin_acct_tenant_idx').on(t.tenantId),
}))

export type Account = typeof accounts.$inferSelect
export type NewAccount = typeof accounts.$inferInsert

// ── Journal Entries ───────────────────────────────────────────────────────────

export const journalEntries = fin.table('journal_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  entryNumber: varchar('entry_number', { length: 30 }).notNull(),
  date: date('date').notNull(),
  description: text('description').notNull(),
  status: finEntryStatus('status').notNull().default('draft'),
  referenceType: varchar('reference_type', { length: 50 }),
  referenceId: uuid('reference_id'),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  postedAt: timestamp('posted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  tenantDateIdx: index('fin_je_tenant_date_idx').on(t.tenantId, t.date),
  refIdx: index('fin_je_ref_idx').on(t.referenceType, t.referenceId),
}))

export type JournalEntry = typeof journalEntries.$inferSelect
export type NewJournalEntry = typeof journalEntries.$inferInsert

// ── Journal Entry Lines ───────────────────────────────────────────────────────

export const journalEntryLines = fin.table('journal_entry_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  entryId: uuid('entry_id').notNull().references(() => journalEntries.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'restrict' }),
  description: text('description'),
  debit: bigint('debit', { mode: 'number' }).notNull().default(0),
  credit: bigint('credit', { mode: 'number' }).notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  entryIdx: index('fin_jel_entry_idx').on(t.entryId),
  accountIdx: index('fin_jel_account_idx').on(t.accountId),
}))

export type JournalEntryLine = typeof journalEntryLines.$inferSelect
export type NewJournalEntryLine = typeof journalEntryLines.$inferInsert

// ── Customer Invoices (AR) ────────────────────────────────────────────────────

export const invoices = fin.table('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull(),
  status: finDocStatus('status').notNull().default('draft'),
  /** FK to platform.contacts (Phase 32). Nullable for back-compat with invoices created before contacts shipped. */
  contactId: uuid('contact_id'),
  customerName: varchar('customer_name', { length: 200 }).notNull(),
  customerEmail: varchar('customer_email', { length: 254 }),
  date: date('date').notNull(),
  dueDate: date('due_date').notNull(),
  notes: text('notes'),
  displayTaxInline: boolean('display_tax_inline').notNull().default(false),
  journalEntryId: uuid('journal_entry_id').references(() => journalEntries.id, { onDelete: 'set null' }),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  tenantStatusIdx: index('fin_inv_tenant_status_idx').on(t.tenantId, t.status),
  tenantDateIdx: index('fin_inv_tenant_date_idx').on(t.tenantId, t.date),
}))

export type Invoice = typeof invoices.$inferSelect
export type NewInvoice = typeof invoices.$inferInsert

// ── Invoice Lines ─────────────────────────────────────────────────────────────

export const invoiceLines = fin.table('invoice_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  description: varchar('description', { length: 300 }).notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: bigint('unit_price', { mode: 'number' }).notNull(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  invoiceIdx: index('fin_invl_invoice_idx').on(t.invoiceId),
}))

export type InvoiceLine = typeof invoiceLines.$inferSelect
export type NewInvoiceLine = typeof invoiceLines.$inferInsert

// ── Vendor Bills (AP) ─────────────────────────────────────────────────────────

export const bills = fin.table('bills', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  billNumber: varchar('bill_number', { length: 50 }).notNull(),
  status: finDocStatus('status').notNull().default('draft'),
  /** FK to platform.contacts (Phase 32). Nullable for back-compat. */
  contactId: uuid('contact_id'),
  vendorName: varchar('vendor_name', { length: 200 }).notNull(),
  vendorRef: varchar('vendor_ref', { length: 100 }),
  date: date('date').notNull(),
  dueDate: date('due_date').notNull(),
  notes: text('notes'),
  displayTaxInline: boolean('display_tax_inline').notNull().default(false),
  journalEntryId: uuid('journal_entry_id').references(() => journalEntries.id, { onDelete: 'set null' }),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  tenantStatusIdx: index('fin_bill_tenant_status_idx').on(t.tenantId, t.status),
  tenantDateIdx: index('fin_bill_tenant_date_idx').on(t.tenantId, t.date),
}))

export type Bill = typeof bills.$inferSelect
export type NewBill = typeof bills.$inferInsert

// ── Bill Lines ────────────────────────────────────────────────────────────────

export const billLines = fin.table('bill_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  billId: uuid('bill_id').notNull().references(() => bills.id, { onDelete: 'cascade' }),
  description: varchar('description', { length: 300 }).notNull(),
  quantity: integer('quantity').notNull().default(1),
  unitPrice: bigint('unit_price', { mode: 'number' }).notNull(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  billIdx: index('fin_billl_bill_idx').on(t.billId),
}))

export type BillLine = typeof billLines.$inferSelect
export type NewBillLine = typeof billLines.$inferInsert

// ── Tax Groups & Taxes (Phase 28) ─────────────────────────────────────────────
//
// Inspired by Odoo's account.tax model:
//   - tax_groups: visual grouping on invoice (e.g., "PPN", "PPh") + summary CoA
//   - taxes: per-rate tax records, scoped to sale or purchase, linked to a CoA
//
// `amount` semantics depend on amount_type:
//   - 'percent' → basis points (1100 = 11.00 %)
//   - 'fixed'   → IDR (Rupiah) per line
// `price_include` true means the unit price on the line is tax-inclusive;
// confirm-posting deducts the tax portion from revenue and posts it to tax_account.

export const finTaxScope = pgEnum('fin_tax_scope', ['sale', 'purchase'])
export const finTaxAmountType = pgEnum('fin_tax_amount_type', ['percent', 'fixed'])

export const taxGroups = fin.table('tax_groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 80 }).notNull(),
  sequence: integer('sequence').notNull().default(10),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  tenantNameUnique: uniqueIndex('fin_taxgrp_tenant_name_uniq').on(t.tenantId, t.name),
}))

export type TaxGroup = typeof taxGroups.$inferSelect
export type NewTaxGroup = typeof taxGroups.$inferInsert

export const taxes = fin.table('taxes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 120 }).notNull(),
  scope: finTaxScope('scope').notNull(),
  amountType: finTaxAmountType('amount_type').notNull().default('percent'),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  taxAccountId: uuid('tax_account_id').notNull().references(() => accounts.id, { onDelete: 'restrict' }),
  groupId: uuid('group_id').references(() => taxGroups.id, { onDelete: 'set null' }),
  priceInclude: boolean('price_include').notNull().default(false),
  isWithholding: boolean('is_withholding').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  sequence: integer('sequence').notNull().default(10),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  tenantScopeIdx: index('fin_tax_tenant_scope_idx').on(t.tenantId, t.scope),
  tenantNameUnique: uniqueIndex('fin_tax_tenant_name_uniq').on(t.tenantId, t.name),
}))

export type Tax = typeof taxes.$inferSelect
export type NewTax = typeof taxes.$inferInsert

// Junctions: many taxes per invoice/bill line.
export const invoiceLineTaxes = fin.table('invoice_line_taxes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  invoiceLineId: uuid('invoice_line_id').notNull().references(() => invoiceLines.id, { onDelete: 'cascade' }),
  taxId: uuid('tax_id').notNull().references(() => taxes.id, { onDelete: 'restrict' }),
}, (t) => ({
  lineTaxUnique: uniqueIndex('fin_invltax_line_tax_uniq').on(t.invoiceLineId, t.taxId),
  lineIdx: index('fin_invltax_line_idx').on(t.invoiceLineId),
}))

export type InvoiceLineTax = typeof invoiceLineTaxes.$inferSelect
export type NewInvoiceLineTax = typeof invoiceLineTaxes.$inferInsert

export const billLineTaxes = fin.table('bill_line_taxes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  billLineId: uuid('bill_line_id').notNull().references(() => billLines.id, { onDelete: 'cascade' }),
  taxId: uuid('tax_id').notNull().references(() => taxes.id, { onDelete: 'restrict' }),
}, (t) => ({
  lineTaxUnique: uniqueIndex('fin_billltax_line_tax_uniq').on(t.billLineId, t.taxId),
  lineIdx: index('fin_billltax_line_idx').on(t.billLineId),
}))

export type BillLineTax = typeof billLineTaxes.$inferSelect
export type NewBillLineTax = typeof billLineTaxes.$inferInsert

// ── Journals (named accounting journals, not raw journal entries) ─────────────

export const journalType = pgEnum('journal_type', ['sale', 'purchase', 'bank', 'cash', 'general'])

export const journals = fin.table('journals', {
  id:              uuid('id').primaryKey().defaultRandom(),
  tenantId:        uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  code:            varchar('code', { length: 5 }).notNull(),   // 2–5 chars, uppercase alphanumeric
  name:            varchar('name', { length: 100 }).notNull(),
  type:            journalType('type').notNull().default('general'),
  currencyCode:    varchar('currency_code', { length: 10 }).notNull().default('IDR'),
  bankAccountId:   uuid('bank_account_id'),                    // FK to accounts, nullable
  sequencePrefix:  varchar('sequence_prefix', { length: 20 }),
  isDefault:       boolean('is_default').notNull().default(false),
  active:          boolean('active').notNull().default(true),
  createdAt:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  tenantCodeUniq: uniqueIndex('fin_journal_tenant_code_uniq').on(t.tenantId, t.code),
  tenantIdx:      index('fin_journal_tenant_idx').on(t.tenantId),
}))
export type Journal    = typeof journals.$inferSelect
export type NewJournal = typeof journals.$inferInsert

// ── Payment Terms ─────────────────────────────────────────────────────────────

export const paymentTerms = fin.table('payment_terms', {
  id:               uuid('id').primaryKey().defaultRandom(),
  tenantId:         uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name:             varchar('name', { length: 100 }).notNull(),
  note:             text('note'),
  complexLogicCode: text('complex_logic_code'),               // sandboxed eval, nullable
  createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:        timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  tenantIdx: index('fin_pt_tenant_idx').on(t.tenantId),
}))
export type PaymentTerm    = typeof paymentTerms.$inferSelect
export type NewPaymentTerm = typeof paymentTerms.$inferInsert

export const paymentTermLines = fin.table('payment_term_lines', {
  id:            uuid('id').primaryKey().defaultRandom(),
  paymentTermId: uuid('payment_term_id').notNull().references(() => paymentTerms.id, { onDelete: 'cascade' }),
  sequence:      integer('sequence').notNull().default(0),
  valuePercent:  numeric('value_percent', { precision: 5, scale: 2 }).notNull(),
  daysOffset:    integer('days_offset').notNull().default(0),
  createdAt:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  ptIdx: index('fin_ptl_pt_idx').on(t.paymentTermId),
}))
export type PaymentTermLine    = typeof paymentTermLines.$inferSelect
export type NewPaymentTermLine = typeof paymentTermLines.$inferInsert

// ── Reconciliation Models ─────────────────────────────────────────────────────

export const reconModelType = pgEnum('recon_model_type', ['suggest', 'auto_match'])

export const reconciliationModels = fin.table('reconciliation_models', {
  id:             uuid('id').primaryKey().defaultRandom(),
  tenantId:       uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name:           varchar('name', { length: 100 }).notNull(),
  type:           reconModelType('type').notNull().default('suggest'),
  tolerance:      numeric('tolerance', { precision: 12, scale: 2 }).notNull().default('0.00'),
  matchLabel:     boolean('match_label').notNull().default(true),
  matchPartner:   boolean('match_partner').notNull().default(false),
  sameCurrency:   boolean('same_currency').notNull().default(true),
  active:         boolean('active').notNull().default(true),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  tenantIdx: index('fin_recon_model_tenant_idx').on(t.tenantId),
}))
export type ReconciliationModel    = typeof reconciliationModels.$inferSelect
export type NewReconciliationModel = typeof reconciliationModels.$inferInsert

// ── Bank Statements ───────────────────────────────────────────────────────────

export const statementStatus = pgEnum('statement_status', ['draft', 'processing', 'reconciled'])

export const bankStatements = fin.table('bank_statements', {
  id:             uuid('id').primaryKey().defaultRandom(),
  tenantId:       uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  journalId:      uuid('journal_id').notNull().references(() => journals.id, { onDelete: 'restrict' }),
  accountNumber:  varchar('account_number', { length: 50 }),
  startingBalance: numeric('starting_balance', { precision: 15, scale: 2 }).notNull().default('0.00'),
  endingBalance:  numeric('ending_balance', { precision: 15, scale: 2 }).notNull().default('0.00'),
  dateFrom:       date('date_from').notNull(),
  dateTo:         date('date_to').notNull(),
  status:         statementStatus('status').notNull().default('draft'),
  recordsCount:   integer('records_count').notNull().default(0),
  reconciledAt:   timestamp('reconciled_at', { withTimezone: true }),
  createdBy:      uuid('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  tenantIdx:  index('fin_stmt_tenant_idx').on(t.tenantId),
  statusIdx:  index('fin_stmt_status_idx').on(t.tenantId, t.status),
}))
export type BankStatement    = typeof bankStatements.$inferSelect
export type NewBankStatement = typeof bankStatements.$inferInsert

export const statementRecords = fin.table('statement_records', {
  id:              uuid('id').primaryKey().defaultRandom(),
  tenantId:        uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  statementId:     uuid('statement_id').notNull().references(() => bankStatements.id, { onDelete: 'cascade' }),
  date:            date('date').notNull(),
  amount:          numeric('amount', { precision: 15, scale: 2 }).notNull(),
  partnerId:       uuid('partner_id'),                         // nullable ref to contacts
  reference:       text('reference'),
  notes:           text('notes'),
  cleared:         boolean('cleared').notNull().default(false),
  journalEntryId:  uuid('journal_entry_id').references(() => journalEntries.id, { onDelete: 'set null' }),
  createdAt:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  stmtIdx:    index('fin_sr_stmt_idx').on(t.statementId),
  clearedIdx: index('fin_sr_cleared_idx').on(t.tenantId, t.cleared),
}))
export type StatementRecord    = typeof statementRecords.$inferSelect
export type NewStatementRecord = typeof statementRecords.$inferInsert

// ── Indonesian Bank Master (global reference table, no tenant scoping) ────────

export const indonesianBanks = fin.table('indonesian_banks', {
  id:        uuid('id').primaryKey().defaultRandom(),
  code:      varchar('code', { length: 10 }).notNull().unique(),   // e.g. 'BCA'
  name:      varchar('name', { length: 100 }).notNull(),
  swiftCode: varchar('swift_code', { length: 11 }),
  active:    boolean('active').notNull().default(true),
}, (t) => ({
  codeUniq: uniqueIndex('fin_bank_code_uniq').on(t.code),
}))
export type IndonesianBank    = typeof indonesianBanks.$inferSelect
export type NewIndonesianBank = typeof indonesianBanks.$inferInsert
