-- IS-HR Core Extension
--
-- Extends hr.departments: manager_id, color
-- Extends hr.employees:   manager_id (self-ref), user_id, work_location,
--                         departure_reason, job_position_id
-- Adds hr.contracts        — definitive financial/legal basis for payroll
-- Adds hr.skill_types      — skill taxonomy categories with colors
-- Adds hr.skills           — individual skills linked to categories
-- Adds hr.employee_skills  — skill matrix assignments with 1-5 level
-- Adds hr.resume_lines     — polymorphic CV/resume timeline entries
-- Adds hr.activity_plans   — onboarding/offboarding workflow templates
-- Adds hr.activity_plan_tasks

-- ── 1. New enum types ─────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hr_work_location') THEN
    CREATE TYPE hr_work_location AS ENUM ('office', 'remote', 'hybrid');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hr_departure_reason') THEN
    CREATE TYPE hr_departure_reason AS ENUM (
      'resignation', 'termination', 'retirement', 'contract_end', 'other'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hr_contract_type') THEN
    CREATE TYPE hr_contract_type AS ENUM (
      'permanent', 'fixed_term', 'internship', 'freelance'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hr_contract_status') THEN
    CREATE TYPE hr_contract_status AS ENUM (
      'draft', 'active', 'expired', 'cancelled'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hr_wage_type') THEN
    CREATE TYPE hr_wage_type AS ENUM ('monthly', 'daily', 'hourly');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hr_resume_line_type') THEN
    CREATE TYPE hr_resume_line_type AS ENUM (
      'education', 'experience', 'certification', 'internal'
    );
  END IF;
END
$$;

-- ── 2. Extend hr.departments ──────────────────────────────────────────────────

ALTER TABLE hr.departments
  ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES hr.employees (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS color      VARCHAR(7);

-- ── 3. Extend hr.employees ────────────────────────────────────────────────────

ALTER TABLE hr.employees
  ADD COLUMN IF NOT EXISTS user_id          UUID REFERENCES platform.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS manager_id       UUID REFERENCES hr.employees (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS work_location    hr_work_location NOT NULL DEFAULT 'office',
  ADD COLUMN IF NOT EXISTS departure_reason hr_departure_reason,
  ADD COLUMN IF NOT EXISTS job_position_id  UUID;

CREATE INDEX IF NOT EXISTS emp_manager_idx ON hr.employees (manager_id);

-- ── 4. hr.contracts ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hr.contracts (
  id            UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID             NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  employee_id   UUID             NOT NULL REFERENCES hr.employees (id) ON DELETE CASCADE,
  contract_type hr_contract_type NOT NULL DEFAULT 'permanent',
  contract_status hr_contract_status NOT NULL DEFAULT 'draft',
  start_date    DATE             NOT NULL,
  end_date      DATE,
  wage_type     hr_wage_type     NOT NULL DEFAULT 'monthly',
  wage          NUMERIC(14,2)    NOT NULL DEFAULT 0,
  benefits      JSONB,
  notes         TEXT,
  signed_at     DATE,
  document_url  VARCHAR(2048),
  created_by    UUID             REFERENCES platform.users (id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS contract_tenant_idx   ON hr.contracts (tenant_id);
CREATE INDEX IF NOT EXISTS contract_employee_idx ON hr.contracts (employee_id);
CREATE INDEX IF NOT EXISTS contract_status_idx   ON hr.contracts (tenant_id, contract_status);

-- ── 5. hr.skill_types ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hr.skill_types (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID        NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  name       VARCHAR(128) NOT NULL,
  color      VARCHAR(7)  NOT NULL DEFAULT '#6B7280',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT skill_type_tenant_name_uniq UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS skill_type_tenant_idx ON hr.skill_types (tenant_id);

-- ── 6. hr.skills ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hr.skills (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  skill_type_id UUID        NOT NULL REFERENCES hr.skill_types (id) ON DELETE CASCADE,
  name          VARCHAR(128) NOT NULL,
  color         VARCHAR(7),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS skill_tenant_idx    ON hr.skills (tenant_id);
CREATE INDEX IF NOT EXISTS skill_type_fk_idx   ON hr.skills (skill_type_id);

-- ── 7. hr.employee_skills ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hr.employee_skills (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  employee_id UUID        NOT NULL REFERENCES hr.employees (id) ON DELETE CASCADE,
  skill_id    UUID        NOT NULL REFERENCES hr.skills (id) ON DELETE CASCADE,
  level       SMALLINT    NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT emp_skill_uniq UNIQUE (employee_id, skill_id)
);

CREATE INDEX IF NOT EXISTS emp_skill_employee_idx ON hr.employee_skills (employee_id);

-- ── 8. hr.resume_lines ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hr.resume_lines (
  id          UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID               NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  employee_id UUID               NOT NULL REFERENCES hr.employees (id) ON DELETE CASCADE,
  line_type   hr_resume_line_type NOT NULL,
  title       VARCHAR(255)       NOT NULL,
  institution VARCHAR(255),
  description TEXT,
  start_date  DATE,
  end_date    DATE,
  is_current  BOOLEAN            NOT NULL DEFAULT FALSE,
  position    SMALLINT           NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS resume_employee_idx ON hr.resume_lines (employee_id);
CREATE INDEX IF NOT EXISTS resume_type_idx     ON hr.resume_lines (employee_id, line_type);

-- ── 9. hr.activity_plans ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hr.activity_plans (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  department_id UUID        REFERENCES hr.departments (id) ON DELETE SET NULL,
  name          VARCHAR(255) NOT NULL,
  plan_type     VARCHAR(32) NOT NULL DEFAULT 'onboarding',
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS activity_plan_tenant_idx ON hr.activity_plans (tenant_id);

-- ── 10. hr.activity_plan_tasks ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hr.activity_plan_tasks (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id       UUID        NOT NULL REFERENCES hr.activity_plans (id) ON DELETE CASCADE,
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  days_offset   SMALLINT    NOT NULL DEFAULT 0,
  assignee_role VARCHAR(64),
  position      SMALLINT    NOT NULL DEFAULT 0
);
