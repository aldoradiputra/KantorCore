-- IS-HR / IS-LMS — Module-agnostic Assessment & Quiz Engine
--
-- assess.assessments         — quiz/test templates
-- assess.sections            — optional sections within a template
-- assess.questions           — questions (MCQ, essay, rating)
-- assess.question_options    — MCQ answer choices
-- assess.sessions            — one attempt per context+subject (polymorphic)
-- assess.answers             — per-question answer rows within a session
--
-- Polymorphic context (context_type / context_id) means this schema is
-- consumed by recruitment, e-learning, and manual sessions without any
-- schema-level coupling to those modules.

-- ── 1. Create schema ──────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS assess;

-- ── 2. Enum types (idempotent) ────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assess_question_type') THEN
    CREATE TYPE assess_question_type AS ENUM (
      'multiple_choice',
      'multiple_select',
      'essay',
      'rating'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assess_session_status') THEN
    CREATE TYPE assess_session_status AS ENUM (
      'pending',
      'in_progress',
      'submitted',
      'graded',
      'expired'
    );
  END IF;
END
$$;

-- ── 3. assess.assessments ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS assess.assessments (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID        NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  title               VARCHAR(255) NOT NULL,
  description         TEXT,
  instructions        TEXT,
  time_limit_minutes  INTEGER,
  passing_score       SMALLINT,
  is_published        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_by          UUID        REFERENCES platform.users (id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS assess_tenant_idx ON assess.assessments (tenant_id);

-- ── 4. assess.sections ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS assess.sections (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID        NOT NULL REFERENCES assess.assessments (id) ON DELETE CASCADE,
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  position      SMALLINT    NOT NULL DEFAULT 0
);

-- ── 5. assess.questions ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS assess.questions (
  id            UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID               NOT NULL REFERENCES assess.assessments (id) ON DELETE CASCADE,
  section_id    UUID               REFERENCES assess.sections (id) ON DELETE SET NULL,
  type          assess_question_type NOT NULL DEFAULT 'multiple_choice',
  content       TEXT               NOT NULL,
  explanation   TEXT,
  position      SMALLINT           NOT NULL DEFAULT 0,
  points        NUMERIC(6,2)       NOT NULL DEFAULT 1.00,
  is_required   BOOLEAN            NOT NULL DEFAULT TRUE,
  rating_max    SMALLINT
);

CREATE INDEX IF NOT EXISTS assess_q_assessment_idx ON assess.questions (assessment_id);

-- ── 6. assess.question_options ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS assess.question_options (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id  UUID        NOT NULL REFERENCES assess.questions (id) ON DELETE CASCADE,
  content      TEXT        NOT NULL,
  is_correct   BOOLEAN     NOT NULL DEFAULT FALSE,
  score_weight NUMERIC(5,2) NOT NULL DEFAULT 1.00,
  position     SMALLINT    NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS assess_opt_question_idx ON assess.question_options (question_id);

-- ── 7. assess.sessions ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS assess.sessions (
  id              UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id   UUID                 NOT NULL REFERENCES assess.assessments (id) ON DELETE RESTRICT,
  -- Polymorphic context: 'application' | 'training' | 'manual'
  context_type    VARCHAR(64),
  context_id      UUID,
  -- Subject: 'candidate' | 'employee'
  subject_type    VARCHAR(64)          NOT NULL,
  subject_id      UUID                 NOT NULL,
  subject_name    VARCHAR(255),
  status          assess_session_status NOT NULL DEFAULT 'pending',
  started_at      TIMESTAMPTZ,
  submitted_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  total_score     NUMERIC(8,2),
  max_score       NUMERIC(8,2),
  passed          BOOLEAN,
  graded_by       UUID                 REFERENCES platform.users (id) ON DELETE SET NULL,
  graded_at       TIMESTAMPTZ,
  reviewer_notes  TEXT,
  created_at      TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS assess_session_ctx_idx     ON assess.sessions (context_type, context_id);
CREATE INDEX IF NOT EXISTS assess_session_subject_idx ON assess.sessions (subject_type, subject_id);
CREATE INDEX IF NOT EXISTS assess_session_status_idx  ON assess.sessions (status);

-- ── 8. assess.answers ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS assess.answers (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          UUID        NOT NULL REFERENCES assess.sessions (id) ON DELETE CASCADE,
  question_id         UUID        NOT NULL REFERENCES assess.questions (id) ON DELETE RESTRICT,
  selected_option_ids UUID[],
  text_response       TEXT,
  rating_value        SMALLINT,
  score               NUMERIC(6,2),
  is_correct          BOOLEAN,
  reviewer_notes      TEXT,
  reviewed_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS assess_ans_session_idx  ON assess.answers (session_id);
CREATE INDEX IF NOT EXISTS assess_ans_question_idx ON assess.answers (question_id);
