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
  customerName: varchar('customer_name', { length: 200 }).notNull(),
  customerEmail: varchar('customer_email', { length: 254 }),
  date: date('date').notNull(),
  dueDate: date('due_date').notNull(),
  notes: text('notes'),
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
  vendorName: varchar('vendor_name', { length: 200 }).notNull(),
  vendorRef: varchar('vendor_ref', { length: 100 }),
  date: date('date').notNull(),
  dueDate: date('due_date').notNull(),
  notes: text('notes'),
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
