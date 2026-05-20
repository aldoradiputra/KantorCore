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
} from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { users } from './users'
import { employees } from './hr'
import { journalEntries } from './fin'

/**
 * IS-PAY — Payroll (Phase 1).
 *
 * A pay run is a periodized batch of payslips. Confirming a pay run posts a
 * single journal entry in IS-FIN:
 *   Debit  5200 Beban Gaji         (gross total)
 *   Credit 2300 Utang Gaji         (net total)
 *   Credit 2210 Utang Pajak PPh21  (PPh 21 withheld)
 *   Credit 2100 Utang BPJS / other deductions
 *
 * Indonesian payroll-specific calculation (PPh 21 brackets, BPJS rates) is
 * not auto-applied at this stage — operators enter line components manually.
 * The shape supports it: each payslip carries an arbitrary set of earning /
 * deduction lines.
 */
export const pay = pgSchema('pay')

export const payRunStatus = pgEnum('pay_run_status', ['draft', 'posted', 'paid', 'cancelled'])
export const payLineKind = pgEnum('pay_line_kind', ['earning', 'deduction'])

export const payRuns = pay.table('pay_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 30 }).notNull(),
  periodStart: date('period_start').notNull(),
  periodEnd: date('period_end').notNull(),
  description: text('description'),
  status: payRunStatus('status').notNull().default('draft'),
  journalEntryId: uuid('journal_entry_id').references(() => journalEntries.id, { onDelete: 'set null' }),
  paymentJournalEntryId: uuid('payment_journal_entry_id').references(() => journalEntries.id, { onDelete: 'set null' }),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  postedAt: timestamp('posted_at', { withTimezone: true }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  tenantCodeUnique: uniqueIndex('pay_run_tenant_code_uniq').on(t.tenantId, t.code),
  tenantPeriodIdx: index('pay_run_tenant_period_idx').on(t.tenantId, t.periodStart),
}))

export type PayRun = typeof payRuns.$inferSelect
export type NewPayRun = typeof payRuns.$inferInsert

export const payslips = pay.table('payslips', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  payRunId: uuid('pay_run_id').notNull().references(() => payRuns.id, { onDelete: 'cascade' }),
  employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'restrict' }),
  employeeName: varchar('employee_name', { length: 200 }).notNull(),
  position: varchar('position', { length: 200 }),
  grossTotal: bigint('gross_total', { mode: 'number' }).notNull().default(0),
  deductionTotal: bigint('deduction_total', { mode: 'number' }).notNull().default(0),
  netTotal: bigint('net_total', { mode: 'number' }).notNull().default(0),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  runIdx: index('pay_slip_run_idx').on(t.payRunId),
  runEmpUnique: uniqueIndex('pay_slip_run_emp_uniq').on(t.payRunId, t.employeeId),
}))

export type Payslip = typeof payslips.$inferSelect
export type NewPayslip = typeof payslips.$inferInsert

export const payslipLines = pay.table('payslip_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  payslipId: uuid('payslip_id').notNull().references(() => payslips.id, { onDelete: 'cascade' }),
  kind: payLineKind('kind').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  amount: bigint('amount', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  payslipIdx: index('pay_line_payslip_idx').on(t.payslipId),
}))

export type PayslipLine = typeof payslipLines.$inferSelect
export type NewPayslipLine = typeof payslipLines.$inferInsert
