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
  smallint,
  numeric,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { users } from './users'

/**
 * IS-HR — HR & Employees (Phase 1).
 *
 * Extended with: contracts, skills matrix, resume lines, activity plans,
 * org-chart manager links, work location, departure reason.
 *
 * Indonesian legal identifiers (NIK, NPWP, BPJS) stored as plain text —
 * validation at the application layer.
 *
 * Attendance / clock-in tracking deliberately excluded per architectural
 * directive. Payroll, KPIs, and Contracts are attendance-independent.
 */
export const hr = pgSchema('hr')

// ── Enums ─────────────────────────────────────────────────────────────────────

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

export const workLocation = pgEnum('hr_work_location', [
  'office',
  'remote',
  'hybrid',
])

export const departureReason = pgEnum('hr_departure_reason', [
  'resignation',
  'termination',
  'retirement',
  'contract_end',
  'other',
])

export const contractType = pgEnum('hr_contract_type', [
  'permanent',
  'fixed_term',
  'internship',
  'freelance',
])

export const contractStatus = pgEnum('hr_contract_status', [
  'draft',
  'active',
  'expired',
  'cancelled',
])

export const wageType = pgEnum('hr_wage_type', [
  'monthly',
  'daily',
  'hourly',
])

export const resumeLineType = pgEnum('hr_resume_line_type', [
  'education',
  'experience',
  'certification',
  'internal',
])

// ── Departments ───────────────────────────────────────────────────────────────

export const departments = hr.table(
  'departments',
  {
    id:        uuid('id').primaryKey().defaultRandom(),
    tenantId:  uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    name:      varchar('name', { length: 255 }).notNull(),
    parentId:  uuid('parent_id'),              // self-ref — add FK in migration after table exists
    managerId: uuid('manager_id'),             // FK to employees.id (nullable)
    color:     varchar('color', { length: 7 }), // hex color e.g. '#3B4FC4'
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('dept_tenant_idx').on(t.tenantId),
  }),
)

export type Department    = typeof departments.$inferSelect
export type NewDepartment = typeof departments.$inferInsert

// ── Employees ─────────────────────────────────────────────────────────────────

export const employees = hr.table(
  'employees',
  {
    id:            uuid('id').primaryKey().defaultRandom(),
    tenantId:      uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    contactId:     uuid('contact_id'),
    userId:        uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    employeeCode:  varchar('employee_code', { length: 50 }),
    name:          varchar('name', { length: 255 }).notNull(),
    email:         varchar('email', { length: 255 }),
    phone:         varchar('phone', { length: 30 }),
    nik:           varchar('nik', { length: 20 }),
    npwp:          varchar('npwp', { length: 25 }),
    bpjsKetenagakerjaan: varchar('bpjs_ketenagakerjaan', { length: 25 }),
    bpjsKesehatan: varchar('bpjs_kesehatan', { length: 25 }),
    departmentId:  uuid('department_id').references(() => departments.id, { onDelete: 'set null' }),
    managerId:     uuid('manager_id'),          // self-ref to employees.id
    position:      varchar('position', { length: 255 }),
    employmentType: employmentType('employment_type').notNull().default('full_time'),
    workLocation:  workLocation('work_location').notNull().default('office'),
    status:        employeeStatus('status').notNull().default('active'),
    hireDate:      date('hire_date'),
    terminationDate: date('termination_date'),
    departureReason: departureReason('departure_reason'),
    notes:         text('notes'),
    jobPositionId: uuid('job_position_id'),     // FK to recruit.job_positions when hired
    createdAt:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt:     timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx:  index('emp_tenant_idx').on(t.tenantId),
    deptIdx:    index('emp_dept_idx').on(t.departmentId),
    statusIdx:  index('emp_status_idx').on(t.tenantId, t.status),
    managerIdx: index('emp_manager_idx').on(t.managerId),
  }),
)

export type Employee       = typeof employees.$inferSelect
export type NewEmployee    = typeof employees.$inferInsert
export type EmploymentType = (typeof employmentType.enumValues)[number]
export type EmployeeStatus = (typeof employeeStatus.enumValues)[number]
export type WorkLocation   = (typeof workLocation.enumValues)[number]
export type DepartureReason = (typeof departureReason.enumValues)[number]

// ── Contracts ─────────────────────────────────────────────────────────────────

export const contracts = hr.table(
  'contracts',
  {
    id:           uuid('id').primaryKey().defaultRandom(),
    tenantId:     uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    employeeId:   uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
    contractType: contractType('contract_type').notNull().default('permanent'),
    status:       contractStatus('contract_status').notNull().default('draft'),
    startDate:    date('start_date').notNull(),
    endDate:      date('end_date'),               // null = indefinite
    wageType:     wageType('wage_type').notNull().default('monthly'),
    wage:         numeric('wage', { precision: 14, scale: 2 }).notNull().default('0.00'),
    benefits:     jsonb('benefits'),              // structured benefits package
    notes:        text('notes'),
    signedAt:     date('signed_at'),
    documentUrl:  varchar('document_url', { length: 2048 }),
    createdBy:    uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt:    timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx:   index('contract_tenant_idx').on(t.tenantId),
    employeeIdx: index('contract_employee_idx').on(t.employeeId),
    statusIdx:   index('contract_status_idx').on(t.tenantId, t.status),
  }),
)

export type Contract    = typeof contracts.$inferSelect
export type NewContract = typeof contracts.$inferInsert
export type ContractType   = (typeof contractType.enumValues)[number]
export type ContractStatus = (typeof contractStatus.enumValues)[number]
export type WageType       = (typeof wageType.enumValues)[number]

// ── Skill Taxonomy ────────────────────────────────────────────────────────────

export const skillTypes = hr.table(
  'skill_types',
  {
    id:        uuid('id').primaryKey().defaultRandom(),
    tenantId:  uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    name:      varchar('name', { length: 128 }).notNull(),
    color:     varchar('color', { length: 7 }).notNull().default('#6B7280'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('skill_type_tenant_idx').on(t.tenantId),
    uniq:      uniqueIndex('skill_type_tenant_name_uniq').on(t.tenantId, t.name),
  }),
)

export type SkillType    = typeof skillTypes.$inferSelect
export type NewSkillType = typeof skillTypes.$inferInsert

export const skills = hr.table(
  'skills',
  {
    id:          uuid('id').primaryKey().defaultRandom(),
    tenantId:    uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    skillTypeId: uuid('skill_type_id').notNull().references(() => skillTypes.id, { onDelete: 'cascade' }),
    name:        varchar('name', { length: 128 }).notNull(),
    color:       varchar('color', { length: 7 }),   // overrides skill_type color if set
    createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx:    index('skill_tenant_idx').on(t.tenantId),
    skillTypeIdx: index('skill_type_idx').on(t.skillTypeId),
  }),
)

export type Skill    = typeof skills.$inferSelect
export type NewSkill = typeof skills.$inferInsert

export const employeeSkills = hr.table(
  'employee_skills',
  {
    id:         uuid('id').primaryKey().defaultRandom(),
    tenantId:   uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
    skillId:    uuid('skill_id').notNull().references(() => skills.id, { onDelete: 'cascade' }),
    level:      smallint('level').notNull().default(1),  // 1–5: Beginner→Expert
    notes:      text('notes'),
    createdAt:  timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    employeeIdx: index('emp_skill_employee_idx').on(t.employeeId),
    uniq:        uniqueIndex('emp_skill_uniq').on(t.employeeId, t.skillId),
  }),
)

export type EmployeeSkill    = typeof employeeSkills.$inferSelect
export type NewEmployeeSkill = typeof employeeSkills.$inferInsert

// ── Resume / CV Lines ─────────────────────────────────────────────────────────

export const resumeLines = hr.table(
  'resume_lines',
  {
    id:          uuid('id').primaryKey().defaultRandom(),
    tenantId:    uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    employeeId:  uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
    lineType:    resumeLineType('line_type').notNull(),
    title:       varchar('title', { length: 255 }).notNull(),
    institution: varchar('institution', { length: 255 }),   // school / company / issuer
    description: text('description'),
    startDate:   date('start_date'),
    endDate:     date('end_date'),
    isCurrent:   boolean('is_current').notNull().default(false),
    position:    smallint('position').notNull().default(0), // display order
    createdAt:   timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    employeeIdx: index('resume_employee_idx').on(t.employeeId),
    typeIdx:     index('resume_type_idx').on(t.employeeId, t.lineType),
  }),
)

export type ResumeLine    = typeof resumeLines.$inferSelect
export type NewResumeLine = typeof resumeLines.$inferInsert
export type ResumeLineType = (typeof resumeLineType.enumValues)[number]

// ── Activity Plans (Onboarding / Offboarding templates) ───────────────────────

export const activityPlans = hr.table(
  'activity_plans',
  {
    id:           uuid('id').primaryKey().defaultRandom(),
    tenantId:     uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'set null' }),
    name:         varchar('name', { length: 255 }).notNull(),  // e.g. 'Onboarding Engineering'
    planType:     varchar('plan_type', { length: 32 }).notNull().default('onboarding'), // 'onboarding' | 'offboarding'
    isActive:     boolean('is_active').notNull().default(true),
    createdAt:    timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('activity_plan_tenant_idx').on(t.tenantId),
  }),
)

export type ActivityPlan = typeof activityPlans.$inferSelect

export const activityPlanTasks = hr.table(
  'activity_plan_tasks',
  {
    id:          uuid('id').primaryKey().defaultRandom(),
    planId:      uuid('plan_id').notNull().references(() => activityPlans.id, { onDelete: 'cascade' }),
    title:       varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    daysOffset:  smallint('days_offset').notNull().default(0), // relative to hire/termination date
    assigneeRole: varchar('assignee_role', { length: 64 }),    // 'manager' | 'hr' | 'it' | etc.
    position:    smallint('position').notNull().default(0),
  },
)

export type ActivityPlanTask = typeof activityPlanTasks.$inferSelect

// ── Timesheet Entries (Phase 1; preserved for IS-TIME) ────────────────────────

export const timesheetEntries = hr.table(
  'timesheet_entries',
  {
    id:              uuid('id').primaryKey().defaultRandom(),
    tenantId:        uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    employeeId:      uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
    projectId:       uuid('project_id'),
    issueId:         uuid('issue_id'),
    date:            date('date').notNull(),
    durationMinutes: integer('duration_minutes').notNull(),
    description:     text('description'),
    billable:        boolean('billable').notNull().default(true),
    createdBy:       uuid('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
    createdAt:       timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt:       timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx:   index('ts_tenant_idx').on(t.tenantId),
    employeeIdx: index('ts_employee_idx').on(t.tenantId, t.employeeId),
    dateIdx:     index('ts_date_idx').on(t.tenantId, t.date),
    projectIdx:  index('ts_project_idx').on(t.projectId),
  }),
)

export type TimesheetEntry    = typeof timesheetEntries.$inferSelect
export type NewTimesheetEntry = typeof timesheetEntries.$inferInsert
