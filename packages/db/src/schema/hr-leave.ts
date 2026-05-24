import {
  uuid,
  text,
  date,
  boolean,
  timestamp,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core'
import { hr } from './hr'
import { tenants } from './tenants'
import { users } from './users'
import { employees } from './hr'

/**
 * IS-HR — Time-off / leave management (Phase 1).
 *
 * Leave requests are tenant-scoped and tied to an employee record.
 * Approval is tracked via `approved_by` (a platform user) and `status`.
 *
 * Indonesian statutory leave types are encoded in the enum; `other` covers
 * company-specific leave policies configured at the tenant level.
 */
export const leaveType = pgEnum('hr_leave_type', [
  'annual_leave',
  'sick_leave',
  'maternity',
  'paternity',
  'unpaid',
  'other',
])

export const leaveStatus = pgEnum('hr_leave_status', [
  'pending',
  'approved',
  'rejected',
])

export const timeOffRequests = hr.table(
  'time_off_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    employeeId: uuid('employee_id')
      .notNull()
      .references(() => employees.id, { onDelete: 'cascade' }),
    leaveType: leaveType('leave_type').notNull(),
    status: leaveStatus('status').notNull().default('pending'),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    halfDay: boolean('half_day').notNull().default(false),
    notes: text('notes'),
    /** The platform user who approved or rejected the request. */
    approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
    /** The platform user who submitted the request (may differ from the employee's linked user). */
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantStatusIdx: index('time_off_tenant_status_idx').on(t.tenantId, t.status),
    tenantEmployeeIdx: index('time_off_tenant_employee_idx').on(t.tenantId, t.employeeId),
    tenantStartDateIdx: index('time_off_tenant_start_date_idx').on(t.tenantId, t.startDate),
    tenantEndDateIdx: index('time_off_tenant_end_date_idx').on(t.tenantId, t.endDate),
  }),
)

export type TimeOffRequest = typeof timeOffRequests.$inferSelect
export type NewTimeOffRequest = typeof timeOffRequests.$inferInsert
export type LeaveType = (typeof leaveType.enumValues)[number]
export type LeaveStatus = (typeof leaveStatus.enumValues)[number]
