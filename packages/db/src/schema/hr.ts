import {
  pgSchema,
  uuid,
  varchar,
  text,
  timestamp,
  date,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core'
import { tenants } from './tenants'

/**
 * IS-HR — HR & Employees (Phase 1).
 *
 * Explicit tenant_id filters on every query (RLS-deferred, same pattern as
 * chat + proj). Indonesian legal identifiers (NIK, NPWP, BPJS) are stored as
 * plain text — validation at the application layer.
 */
export const hr = pgSchema('hr')

export const employmentType = pgEnum('hr_employment_type', [
  'full_time',
  'part_time',
  'contract',
  'intern',
])

export const employeeStatus = pgEnum('hr_employee_status', [
  'active',
  'inactive',
  'terminated',
])

// ── Departments ───────────────────────────────────────────────────────────────
export const departments = hr.table(
  'departments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    parentId: uuid('parent_id'), // self-reference set after table definition
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('dept_tenant_idx').on(t.tenantId),
  }),
)

export type Department = typeof departments.$inferSelect
export type NewDepartment = typeof departments.$inferInsert

// ── Employees ─────────────────────────────────────────────────────────────────
export const employees = hr.table(
  'employees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    employeeCode: varchar('employee_code', { length: 50 }),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 30 }),
    // Indonesian legal identifiers
    nik: varchar('nik', { length: 20 }),            // Nomor Induk Kependudukan
    npwp: varchar('npwp', { length: 25 }),           // Nomor Pokok Wajib Pajak
    bpjsKetenagakerjaan: varchar('bpjs_ketenagakerjaan', { length: 25 }),
    bpjsKesehatan: varchar('bpjs_kesehatan', { length: 25 }),
    // Org structure
    departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'set null' }),
    position: varchar('position', { length: 255 }),
    employmentType: employmentType('employment_type').notNull().default('full_time'),
    status: employeeStatus('status').notNull().default('active'),
    hireDate: date('hire_date'),
    terminationDate: date('termination_date'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('emp_tenant_idx').on(t.tenantId),
    deptIdx: index('emp_dept_idx').on(t.departmentId),
    statusIdx: index('emp_status_idx').on(t.tenantId, t.status),
  }),
)

export type Employee = typeof employees.$inferSelect
export type NewEmployee = typeof employees.$inferInsert
export type EmploymentType = (typeof employmentType.enumValues)[number]
export type EmployeeStatus = (typeof employeeStatus.enumValues)[number]
