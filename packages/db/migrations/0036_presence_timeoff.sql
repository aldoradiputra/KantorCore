-- IS-HR / IS-PLAT: Time-off requests + real-time user presence.
--
-- hr.time_off_requests — employee leave management (annual, sick, etc.)
-- platform.user_presence — per-tenant online/away/offline status for chat + UI

-- ── 1. Enum types (idempotent via DO block) ──────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hr_leave_type') THEN
    CREATE TYPE hr_leave_type AS ENUM (
      'annual_leave',
      'sick_leave',
      'maternity',
      'paternity',
      'unpaid',
      'other'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hr_leave_status') THEN
    CREATE TYPE hr_leave_status AS ENUM (
      'pending',
      'approved',
      'rejected'
    );
  END IF;
END
$$;

-- ── 2. hr.time_off_requests ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hr.time_off_requests (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  employee_id  UUID        NOT NULL REFERENCES hr.employees (id) ON DELETE CASCADE,
  leave_type   hr_leave_type NOT NULL,
  status       hr_leave_status NOT NULL DEFAULT 'pending',
  start_date   DATE        NOT NULL,
  end_date     DATE        NOT NULL,
  half_day     BOOLEAN     NOT NULL DEFAULT FALSE,
  notes        TEXT,
  approved_by  UUID        REFERENCES platform.users (id) ON DELETE SET NULL,
  created_by   UUID        NOT NULL REFERENCES platform.users (id) ON DELETE RESTRICT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT time_off_end_after_start CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS time_off_tenant_status_idx
  ON hr.time_off_requests (tenant_id, status);

CREATE INDEX IF NOT EXISTS time_off_tenant_employee_idx
  ON hr.time_off_requests (tenant_id, employee_id);

CREATE INDEX IF NOT EXISTS time_off_tenant_start_date_idx
  ON hr.time_off_requests (tenant_id, start_date);

CREATE INDEX IF NOT EXISTS time_off_tenant_end_date_idx
  ON hr.time_off_requests (tenant_id, end_date);

-- ── 3. platform.user_presence ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS platform.user_presence (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID        NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES platform.users (id) ON DELETE CASCADE,
  -- 'online' | 'away' | 'offline'
  status        VARCHAR(20) NOT NULL DEFAULT 'offline',
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT user_presence_tenant_user_unique UNIQUE (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS user_presence_tenant_status_idx
  ON platform.user_presence (tenant_id, status);
