-- IS-HR Gamification — Challenges, Badges, Goal History
--
-- gamify.badges               — visual award tokens
-- gamify.employee_badges      — earned / manually awarded instances
-- gamify.challenges           — KPI definitions with target metrics
-- gamify.employee_challenges  — enrollments with progress tracking
-- gamify.goal_history         — audit log for performance reviews

-- ── 1. Create schema ──────────────────────────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS gamify;

-- ── 2. Enum types ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gamify_metric_type') THEN
    CREATE TYPE gamify_metric_type AS ENUM (
      'revenue', 'deals_closed', 'tasks_completed', 'training_hours', 'custom'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gamify_challenge_status') THEN
    CREATE TYPE gamify_challenge_status AS ENUM (
      'active', 'completed', 'failed', 'cancelled'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gamify_goal_result') THEN
    CREATE TYPE gamify_goal_result AS ENUM (
      'achieved', 'partially_achieved', 'missed'
    );
  END IF;
END
$$;

-- ── 3. gamify.badges ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gamify.badges (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  name        VARCHAR(128) NOT NULL,
  icon        VARCHAR(64) NOT NULL DEFAULT '🏆',
  color       VARCHAR(7)  NOT NULL DEFAULT '#3B4FC4',
  description TEXT,
  is_system   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_by  UUID        REFERENCES platform.users (id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS badge_tenant_idx ON gamify.badges (tenant_id);

-- ── 4. gamify.employee_badges ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gamify.employee_badges (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  employee_id  UUID        NOT NULL REFERENCES hr.employees (id) ON DELETE CASCADE,
  badge_id     UUID        NOT NULL REFERENCES gamify.badges (id) ON DELETE CASCADE,
  awarded_by   UUID        REFERENCES platform.users (id) ON DELETE SET NULL,
  awarded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason       TEXT,
  challenge_id UUID
);

CREATE INDEX IF NOT EXISTS emp_badge_employee_idx ON gamify.employee_badges (employee_id);
CREATE INDEX IF NOT EXISTS emp_badge_badge_idx    ON gamify.employee_badges (badge_id);

-- ── 5. gamify.challenges ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gamify.challenges (
  id            UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID               NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  title         VARCHAR(255)       NOT NULL,
  description   TEXT,
  metric_type   gamify_metric_type NOT NULL DEFAULT 'custom',
  target_value  NUMERIC(14,2)      NOT NULL,
  target_date   DATE,
  badge_id      UUID               REFERENCES gamify.badges (id) ON DELETE SET NULL,
  is_repeatable BOOLEAN            NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN            NOT NULL DEFAULT TRUE,
  created_by    UUID               REFERENCES platform.users (id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS challenge_tenant_idx ON gamify.challenges (tenant_id);
CREATE INDEX IF NOT EXISTS challenge_active_idx ON gamify.challenges (tenant_id, is_active);

-- ── 6. gamify.employee_challenges ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gamify.employee_challenges (
  id               UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID                    NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  employee_id      UUID                    NOT NULL REFERENCES hr.employees (id) ON DELETE CASCADE,
  challenge_id     UUID                    NOT NULL REFERENCES gamify.challenges (id) ON DELETE CASCADE,
  current_progress NUMERIC(14,2)           NOT NULL DEFAULT 0,
  status           gamify_challenge_status NOT NULL DEFAULT 'active',
  completed_at     TIMESTAMPTZ,
  assigned_by      UUID                    REFERENCES platform.users (id) ON DELETE SET NULL,
  assigned_at      TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  notes            TEXT,
  CONSTRAINT emp_chall_uniq UNIQUE (employee_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS emp_chall_employee_idx ON gamify.employee_challenges (employee_id);
CREATE INDEX IF NOT EXISTS emp_chall_challenge_idx ON gamify.employee_challenges (challenge_id);
CREATE INDEX IF NOT EXISTS emp_chall_status_idx    ON gamify.employee_challenges (tenant_id, status);

-- ── 7. gamify.goal_history ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gamify.goal_history (
  id               UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID               NOT NULL REFERENCES platform.tenants (id) ON DELETE CASCADE,
  employee_id      UUID               NOT NULL REFERENCES hr.employees (id) ON DELETE CASCADE,
  challenge_id     UUID               REFERENCES gamify.challenges (id) ON DELETE SET NULL,
  challenge_title  VARCHAR(255)       NOT NULL,
  result           gamify_goal_result NOT NULL,
  period           VARCHAR(20)        NOT NULL,
  final_progress   NUMERIC(14,2)      NOT NULL DEFAULT 0,
  target_value     NUMERIC(14,2)      NOT NULL,
  review_notes     TEXT,
  reviewed_by      UUID               REFERENCES platform.users (id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  recorded_at      TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS goal_hist_employee_idx ON gamify.goal_history (employee_id);
CREATE INDEX IF NOT EXISTS goal_hist_period_idx   ON gamify.goal_history (tenant_id, period);
