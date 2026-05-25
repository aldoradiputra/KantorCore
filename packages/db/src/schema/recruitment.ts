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
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { users } from './users'
import { departments, employees, employmentType } from './hr'

/**
 * IS-HR Recruitment Pipeline.
 *
 * State machine: new → screening → interview → assessment → offer → hired | rejected
 * Application IDs are human-readable: APP-{YYYY}-{SEQ:0000} (e.g. APP-2026-0001)
 */
export const recruit = pgSchema('recruit')

// ── Enums ─────────────────────────────────────────────────────────────────────

export const jobPositionStatus = pgEnum('recruit_job_status', [
  'draft',
  'open',
  'closed',
  'cancelled',
])

export const applicationStatus = pgEnum('recruit_app_status', [
  'new',
  'screening',
  'interview',
  'assessment',
  'offer',
  'hired',
  'rejected',
])

export const offerStatus = pgEnum('recruit_offer_status', [
  'draft',
  'pending',
  'accepted',
  'declined',
  'expired',
])

// ── Job Positions ─────────────────────────────────────────────────────────────

export const jobPositions = recruit.table(
  'job_positions',
  {
    id:               uuid('id').primaryKey().defaultRandom(),
    tenantId:         uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    title:            varchar('title', { length: 255 }).notNull(),
    departmentId:     uuid('department_id').references(() => departments.id, { onDelete: 'set null' }),
    headcount:        smallint('headcount').notNull().default(1),
    description:      text('description'),
    requirements:     text('requirements'),
    status:           jobPositionStatus('status').notNull().default('draft'),
    employmentType:   employmentType('employment_type').notNull().default('full_time'),
    salaryMin:        numeric('salary_min', { precision: 14, scale: 2 }),
    salaryMax:        numeric('salary_max', { precision: 14, scale: 2 }),
    isRemoteFriendly: boolean('is_remote_friendly').notNull().default(false),
    // Assessment to assign automatically when applications reach 'assessment' stage
    defaultAssessmentId: uuid('default_assessment_id'),  // FK to assess.assessments
    postedAt:         timestamp('posted_at', { withTimezone: true }),
    closedAt:         timestamp('closed_at', { withTimezone: true }),
    createdBy:        uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt:        timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx:  index('job_pos_tenant_idx').on(t.tenantId),
    statusIdx:  index('job_pos_status_idx').on(t.tenantId, t.status),
  }),
)

export type JobPosition    = typeof jobPositions.$inferSelect
export type NewJobPosition = typeof jobPositions.$inferInsert
export type JobPositionStatus = (typeof jobPositionStatus.enumValues)[number]

// ── Applications ──────────────────────────────────────────────────────────────

export const applications = recruit.table(
  'applications',
  {
    id:               uuid('id').primaryKey().defaultRandom(),
    tenantId:         uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    jobPositionId:    uuid('job_position_id').notNull().references(() => jobPositions.id, { onDelete: 'restrict' }),
    appNumber:        varchar('app_number', { length: 30 }).notNull(),  // APP-2026-0001
    // Candidate info (denormalized — no candidate account required)
    candidateName:    varchar('candidate_name', { length: 255 }).notNull(),
    candidateEmail:   varchar('candidate_email', { length: 255 }).notNull(),
    candidatePhone:   varchar('candidate_phone', { length: 30 }),
    coverLetter:      text('cover_letter'),
    // Pipeline state
    status:           applicationStatus('status').notNull().default('new'),
    // Assessment linkage (polymorphic — see assess.sessions contextType='application')
    assessSessionId:  uuid('assess_session_id'),
    // Outcome
    rejectionReason:  text('rejection_reason'),
    hiredEmployeeId:  uuid('hired_employee_id').references(() => employees.id, { onDelete: 'set null' }),
    // Attribution
    source:           varchar('source', { length: 64 }),  // 'careers_portal' | 'linkedin' | 'referral' | etc.
    createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt:        timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx:    index('app_tenant_idx').on(t.tenantId),
    statusIdx:    index('app_status_idx').on(t.tenantId, t.status),
    jobIdx:       index('app_job_idx').on(t.jobPositionId),
    appNumberIdx: uniqueIndex('app_number_tenant_uniq').on(t.tenantId, t.appNumber),
  }),
)

export type Application    = typeof applications.$inferSelect
export type NewApplication = typeof applications.$inferInsert
export type ApplicationStatus = (typeof applicationStatus.enumValues)[number]

// ── Application Attachments ───────────────────────────────────────────────────

export const applicationAttachments = recruit.table(
  'application_attachments',
  {
    id:            uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
    name:          varchar('name', { length: 255 }).notNull(),
    fileUrl:       varchar('file_url', { length: 2048 }).notNull(),
    fileType:      varchar('file_type', { length: 64 }),  // 'cv' | 'cover_letter' | 'portfolio' | 'other'
    mimeType:      varchar('mime_type', { length: 128 }),
    sizeBytes:     integer('size_bytes'),
    uploadedAt:    timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    applicationIdx: index('attach_application_idx').on(t.applicationId),
  }),
)

export type ApplicationAttachment = typeof applicationAttachments.$inferSelect

// ── Application Stage Log ─────────────────────────────────────────────────────

export const applicationStageLog = recruit.table(
  'application_stage_log',
  {
    id:            uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
    fromStatus:    applicationStatus('from_status'),
    toStatus:      applicationStatus('to_status').notNull(),
    notes:         text('notes'),
    changedBy:     uuid('changed_by').references(() => users.id, { onDelete: 'set null' }),
    changedAt:     timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    applicationIdx: index('stage_log_application_idx').on(t.applicationId),
  }),
)

export type ApplicationStageLog = typeof applicationStageLog.$inferSelect

// ── Job Offers ────────────────────────────────────────────────────────────────

export const jobOffers = recruit.table(
  'job_offers',
  {
    id:               uuid('id').primaryKey().defaultRandom(),
    tenantId:         uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    applicationId:    uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
    status:           offerStatus('status').notNull().default('draft'),
    proposedSalary:   numeric('proposed_salary', { precision: 14, scale: 2 }).notNull(),
    employmentType:   employmentType('employment_type').notNull().default('full_time'),
    startDate:        date('start_date'),
    notes:            text('notes'),
    expiresAt:        timestamp('expires_at', { withTimezone: true }),
    sentAt:           timestamp('sent_at', { withTimezone: true }),
    acceptedAt:       timestamp('accepted_at', { withTimezone: true }),
    declinedAt:       timestamp('declined_at', { withTimezone: true }),
    createdBy:        uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt:        timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx:      index('offer_tenant_idx').on(t.tenantId),
    applicationIdx: index('offer_application_idx').on(t.applicationId),
    statusIdx:      index('offer_status_idx').on(t.tenantId, t.status),
  }),
)

export type JobOffer    = typeof jobOffers.$inferSelect
export type NewJobOffer = typeof jobOffers.$inferInsert
export type OfferStatus = (typeof offerStatus.enumValues)[number]
