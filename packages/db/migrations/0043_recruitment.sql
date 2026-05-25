-- IS-HR Recruitment Pipeline
--
-- recruit.job_positions         — headcount budgets, job descriptions
-- recruit.applications          — candidate submissions with APP-YYYY-NNNN IDs
-- recruit.application_attachments — CV, cover letter, portfolio uploads
-- recruit.application_stage_log — audit trail of stage transitions
-- recruit.job_offers            — compensation offers with approval states

-- ── 1. Create schema ──────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS recruit;

-- ── 2. Enum types ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recruit_job_status') THEN
    CREATE TYPE recruit_job_status AS ENUM ('draft', 'open', 'closed', 'cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recruit_app_status') THEN
    CREATE TYPE recruit_app_status AS ENUM (
      'new', 'screening', 'interview', 'assessment', 'offer', 'hired', 'rejected'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recruit_offer_status') THEN
    CREATE TYPE recruit_offer_status AS ENUM (
      'draft', 'pending', 'accepted', 'declined', 'expired'
    );
  END IF;
END
$$;

-- ── 3. recruit.job_positions ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recruit.job_positions (
  id                    UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID               NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  title                 VARCHAR(255)       NOT NULL,
  department_id         UUID               REFERENCES hr.departments (id) ON DELETE SET NULL,
  headcount             SMALLINT           NOT NULL DEFAULT 1,
  description           TEXT,
  requirements          TEXT,
  status                recruit_job_status NOT NULL DEFAULT 'draft',
  employment_type       hr_employment_type NOT NULL DEFAULT 'full_time',
  salary_min            NUMERIC(14,2),
  salary_max            NUMERIC(14,2),
  is_remote_friendly    BOOLEAN            NOT NULL DEFAULT FALSE,
  default_assessment_id UUID,
  posted_at             TIMESTAMPTZ,
  closed_at             TIMESTAMPTZ,
  created_by            UUID               REFERENCES platform.users (id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS job_pos_tenant_idx ON recruit.job_positions (tenant_id);
CREATE INDEX IF NOT EXISTS job_pos_status_idx ON recruit.job_positions (tenant_id, status);

-- ── 4. Application sequence counter ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recruit.app_seq (
  tenant_id UUID    NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  year      SMALLINT NOT NULL,
  seq       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, year)
);

-- ── 5. recruit.applications ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recruit.applications (
  id                UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID               NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  job_position_id   UUID               NOT NULL REFERENCES recruit.job_positions (id) ON DELETE RESTRICT,
  app_number        VARCHAR(30)        NOT NULL,
  candidate_name    VARCHAR(255)       NOT NULL,
  candidate_email   VARCHAR(255)       NOT NULL,
  candidate_phone   VARCHAR(30),
  cover_letter      TEXT,
  status            recruit_app_status NOT NULL DEFAULT 'new',
  assess_session_id UUID,
  rejection_reason  TEXT,
  hired_employee_id UUID               REFERENCES hr.employees (id) ON DELETE SET NULL,
  source            VARCHAR(64),
  created_at        TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  CONSTRAINT app_number_tenant_uniq UNIQUE (tenant_id, app_number)
);

CREATE INDEX IF NOT EXISTS app_tenant_idx  ON recruit.applications (tenant_id);
CREATE INDEX IF NOT EXISTS app_status_idx  ON recruit.applications (tenant_id, status);
CREATE INDEX IF NOT EXISTS app_job_idx     ON recruit.applications (job_position_id);

-- ── 6. recruit.application_attachments ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS recruit.application_attachments (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID        NOT NULL REFERENCES recruit.applications (id) ON DELETE CASCADE,
  name           VARCHAR(255) NOT NULL,
  file_url       VARCHAR(2048) NOT NULL,
  file_type      VARCHAR(64),
  mime_type      VARCHAR(128),
  size_bytes     INTEGER,
  uploaded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS attach_application_idx ON recruit.application_attachments (application_id);

-- ── 7. recruit.application_stage_log ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recruit.application_stage_log (
  id             UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID               NOT NULL REFERENCES recruit.applications (id) ON DELETE CASCADE,
  from_status    recruit_app_status,
  to_status      recruit_app_status NOT NULL,
  notes          TEXT,
  changed_by     UUID               REFERENCES platform.users (id) ON DELETE SET NULL,
  changed_at     TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stage_log_application_idx ON recruit.application_stage_log (application_id);

-- ── 8. recruit.job_offers ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS recruit.job_offers (
  id               UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID                 NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  application_id   UUID                 NOT NULL REFERENCES recruit.applications (id) ON DELETE CASCADE,
  status           recruit_offer_status NOT NULL DEFAULT 'draft',
  proposed_salary  NUMERIC(14,2)        NOT NULL,
  employment_type  hr_employment_type   NOT NULL DEFAULT 'full_time',
  start_date       DATE,
  notes            TEXT,
  expires_at       TIMESTAMPTZ,
  sent_at          TIMESTAMPTZ,
  accepted_at      TIMESTAMPTZ,
  declined_at      TIMESTAMPTZ,
  created_by       UUID                 REFERENCES platform.users (id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS offer_tenant_idx      ON recruit.job_offers (tenant_id);
CREATE INDEX IF NOT EXISTS offer_application_idx ON recruit.job_offers (application_id);
CREATE INDEX IF NOT EXISTS offer_status_idx      ON recruit.job_offers (tenant_id, status);
