import {
  pgSchema,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
  index,
  integer,
  boolean,
  smallint,
  numeric,
} from 'drizzle-orm/pg-core'
import { tenants } from './tenants'
import { users } from './users'

/**
 * IS-HR / IS-LMS — Reusable Assessment & Quiz Engine (module-agnostic).
 *
 * Context references are polymorphic (contextType + contextId) so the same
 * schema serves recruitment application tests, e-learning enrollments, and
 * manual ad-hoc sessions without any schema coupling to those modules.
 */
export const assess = pgSchema('assess')

// ── Enums ─────────────────────────────────────────────────────────────────────

export const questionType = pgEnum('assess_question_type', [
  'multiple_choice',   // single correct answer, auto-graded
  'multiple_select',   // one or more correct answers, auto-graded
  'essay',             // free text, requires manual grading
  'rating',            // numeric 1–N scale
])

export const sessionStatus = pgEnum('assess_session_status', [
  'pending',      // created but not yet started
  'in_progress',  // candidate is actively working
  'submitted',    // submitted, awaiting grading (esp. essay)
  'graded',       // fully scored
  'expired',      // time limit elapsed without submission
])

// ── Assessment templates ──────────────────────────────────────────────────────

export const assessments = assess.table(
  'assessments',
  {
    id:               uuid('id').primaryKey().defaultRandom(),
    tenantId:         uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    title:            varchar('title', { length: 255 }).notNull(),
    description:      text('description'),
    instructions:     text('instructions'),
    timeLimitMinutes: integer('time_limit_minutes'),         // null = unlimited
    passingScore:     smallint('passing_score'),             // 0–100 pct; null = no threshold
    isPublished:      boolean('is_published').notNull().default(false),
    createdBy:        uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt:        timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt:        timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdx: index('assess_tenant_idx').on(t.tenantId),
  }),
)

export type Assessment    = typeof assessments.$inferSelect
export type NewAssessment = typeof assessments.$inferInsert

// ── Sections (optional grouping within an assessment) ─────────────────────────

export const assessmentSections = assess.table('sections', {
  id:           uuid('id').primaryKey().defaultRandom(),
  assessmentId: uuid('assessment_id').notNull().references(() => assessments.id, { onDelete: 'cascade' }),
  title:        varchar('title', { length: 255 }).notNull(),
  description:  text('description'),
  position:     smallint('position').notNull().default(0),
})

export type AssessmentSection = typeof assessmentSections.$inferSelect

// ── Questions ─────────────────────────────────────────────────────────────────

export const questions = assess.table(
  'questions',
  {
    id:           uuid('id').primaryKey().defaultRandom(),
    assessmentId: uuid('assessment_id').notNull().references(() => assessments.id, { onDelete: 'cascade' }),
    sectionId:    uuid('section_id').references(() => assessmentSections.id, { onDelete: 'set null' }),
    type:         questionType('type').notNull().default('multiple_choice'),
    content:      text('content').notNull(),
    explanation:  text('explanation'),                   // shown post-grading
    position:     smallint('position').notNull().default(0),
    points:       numeric('points', { precision: 6, scale: 2 }).notNull().default('1.00'),
    isRequired:   boolean('is_required').notNull().default(true),
    ratingMax:    smallint('rating_max'),                // for 'rating' type (e.g. 5 or 10)
  },
  (t) => ({
    assessIdx: index('assess_q_assessment_idx').on(t.assessmentId),
  }),
)

export type Question    = typeof questions.$inferSelect
export type NewQuestion = typeof questions.$inferInsert
export type QuestionType = (typeof questionType.enumValues)[number]

// ── Question options (MCQ / multiple_select) ──────────────────────────────────

export const questionOptions = assess.table(
  'question_options',
  {
    id:          uuid('id').primaryKey().defaultRandom(),
    questionId:  uuid('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
    content:     text('content').notNull(),
    isCorrect:   boolean('is_correct').notNull().default(false),
    scoreWeight: numeric('score_weight', { precision: 5, scale: 2 }).notNull().default('1.00'),
    position:    smallint('position').notNull().default(0),
  },
  (t) => ({
    questionIdx: index('assess_opt_question_idx').on(t.questionId),
  }),
)

export type QuestionOption = typeof questionOptions.$inferSelect

// ── Sessions (one sitting / attempt) ─────────────────────────────────────────

export const assessSessions = assess.table(
  'sessions',
  {
    id:           uuid('id').primaryKey().defaultRandom(),
    assessmentId: uuid('assessment_id').notNull().references(() => assessments.id, { onDelete: 'restrict' }),

    // Polymorphic context — what triggered this session
    // contextType: 'application' | 'training' | 'manual'
    contextType:  varchar('context_type', { length: 64 }),
    contextId:    uuid('context_id'),

    // Who is taking the test (polymorphic subject)
    // subjectType: 'candidate' | 'employee'
    subjectType:  varchar('subject_type', { length: 64 }).notNull(),
    subjectId:    uuid('subject_id').notNull(),
    subjectName:  varchar('subject_name', { length: 255 }),

    // State
    status:       sessionStatus('status').notNull().default('pending'),
    startedAt:    timestamp('started_at', { withTimezone: true }),
    submittedAt:  timestamp('submitted_at', { withTimezone: true }),
    expiresAt:    timestamp('expires_at', { withTimezone: true }),

    // Results
    totalScore:     numeric('total_score', { precision: 8, scale: 2 }),
    maxScore:       numeric('max_score', { precision: 8, scale: 2 }),
    passed:         boolean('passed'),
    gradedBy:       uuid('graded_by').references(() => users.id, { onDelete: 'set null' }),
    gradedAt:       timestamp('graded_at', { withTimezone: true }),
    reviewerNotes:  text('reviewer_notes'),
    createdAt:      timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    contextIdx: index('assess_session_ctx_idx').on(t.contextType, t.contextId),
    subjectIdx: index('assess_session_subject_idx').on(t.subjectType, t.subjectId),
    statusIdx:  index('assess_session_status_idx').on(t.status),
  }),
)

export type AssessSession    = typeof assessSessions.$inferSelect
export type SessionStatus    = (typeof sessionStatus.enumValues)[number]

// ── Answers (one row per question per session) ────────────────────────────────

export const assessAnswers = assess.table(
  'answers',
  {
    id:                uuid('id').primaryKey().defaultRandom(),
    sessionId:         uuid('session_id').notNull().references(() => assessSessions.id, { onDelete: 'cascade' }),
    questionId:        uuid('question_id').notNull().references(() => questions.id, { onDelete: 'restrict' }),
    selectedOptionIds: uuid('selected_option_ids').array(),  // MCQ / multiple_select
    textResponse:      text('text_response'),                // essay
    ratingValue:       smallint('rating_value'),             // rating type
    score:             numeric('score', { precision: 6, scale: 2 }),
    isCorrect:         boolean('is_correct'),
    reviewerNotes:     text('reviewer_notes'),
    reviewedAt:        timestamp('reviewed_at', { withTimezone: true }),
  },
  (t) => ({
    sessionIdx:  index('assess_ans_session_idx').on(t.sessionId),
    questionIdx: index('assess_ans_question_idx').on(t.questionId),
  }),
)

export type AssessAnswer = typeof assessAnswers.$inferSelect
