-- CRM Sales Pipeline Module
-- Adds: sales teams, team members, leads, assignment rules; extends deals

-- ── Enums ─────────────────────────────────────────────────────────────────────

CREATE TYPE crm.assignment_rule_type AS ENUM ('round_robin', 'load_balanced', 'rule_based', 'manual');
CREATE TYPE crm.assignment_frequency  AS ENUM ('daily', 'weekly', 'monthly');
CREATE TYPE crm.lead_status           AS ENUM ('new', 'contacted', 'qualified', 'disqualified', 'converted');
CREATE TYPE crm.recurring_type        AS ENUM ('one_time', 'monthly', 'quarterly', 'annual');

-- ── Sales Teams ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm.sales_teams (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  name                 VARCHAR(200) NOT NULL,
  description          TEXT,
  leader_id            UUID REFERENCES platform.users(id) ON DELETE SET NULL,
  target_revenue       BIGINT NOT NULL DEFAULT 0,
  target_deal_count    INTEGER NOT NULL DEFAULT 0,
  assignment_frequency crm.assignment_frequency NOT NULL DEFAULT 'weekly',
  active               BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX crm_sales_teams_tenant_idx ON crm.sales_teams(tenant_id);

-- ── Sales Team Members ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm.sales_team_members (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id                UUID NOT NULL REFERENCES crm.sales_teams(id) ON DELETE CASCADE,
  user_id                UUID NOT NULL REFERENCES platform.users(id) ON DELETE CASCADE,
  role                   VARCHAR(20) NOT NULL DEFAULT 'member',
  personal_target_revenue BIGINT,
  active                 BOOLEAN NOT NULL DEFAULT TRUE,
  joined_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);
CREATE INDEX crm_team_members_team_idx ON crm.sales_team_members(team_id);
CREATE INDEX crm_team_members_user_idx ON crm.sales_team_members(user_id);

-- ── Assignment Rules ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm.assignment_rules (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  team_id             UUID NOT NULL REFERENCES crm.sales_teams(id) ON DELETE CASCADE,
  name                VARCHAR(200) NOT NULL,
  rule_type           crm.assignment_rule_type NOT NULL DEFAULT 'round_robin',
  conditions          JSONB NOT NULL DEFAULT '{}',
  eligible_member_ids JSONB NOT NULL DEFAULT '[]',
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  last_triggered_at   TIMESTAMPTZ,
  created_by          UUID REFERENCES platform.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX crm_assignment_rules_team_idx ON crm.assignment_rules(team_id);

-- ── Leads (pre-opportunity) ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm.leads (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  lead_number          VARCHAR(32) NOT NULL,
  first_name           VARCHAR(100) NOT NULL,
  last_name            VARCHAR(100),
  email                VARCHAR(300),
  phone                VARCHAR(50),
  company_name         VARCHAR(200),
  job_title            VARCHAR(200),
  industry             VARCHAR(100),
  employee_count       INTEGER,
  location             VARCHAR(200),
  utm_source           VARCHAR(200),
  utm_medium           VARCHAR(200),
  utm_campaign         VARCHAR(200),
  tags                 JSONB NOT NULL DEFAULT '[]',
  lead_status          crm.lead_status NOT NULL DEFAULT 'new',
  assigned_to          UUID REFERENCES platform.users(id) ON DELETE SET NULL,
  assigned_team_id     UUID REFERENCES crm.sales_teams(id) ON DELETE SET NULL,
  assigned_at          TIMESTAMPTZ,
  assignment_rule_id   UUID REFERENCES crm.assignment_rules(id) ON DELETE SET NULL,
  converted_to_deal_id UUID REFERENCES crm.deals(id) ON DELETE SET NULL,
  converted_at         TIMESTAMPTZ,
  notes                TEXT,
  created_by           UUID REFERENCES platform.users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at           TIMESTAMPTZ
);
CREATE INDEX crm_leads_tenant_idx     ON crm.leads(tenant_id);
CREATE INDEX crm_leads_assigned_idx   ON crm.leads(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX crm_leads_team_idx       ON crm.leads(assigned_team_id) WHERE assigned_team_id IS NOT NULL;
CREATE INDEX crm_leads_status_idx     ON crm.leads(tenant_id, lead_status);

-- ── Extend Deals ──────────────────────────────────────────────────────────────

ALTER TABLE crm.deals
  ADD COLUMN IF NOT EXISTS probability              SMALLINT NOT NULL DEFAULT 20 CHECK (probability >= 0 AND probability <= 100),
  ADD COLUMN IF NOT EXISTS team_id                 UUID REFERENCES crm.sales_teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS utm_source              VARCHAR(200),
  ADD COLUMN IF NOT EXISTS utm_medium              VARCHAR(200),
  ADD COLUMN IF NOT EXISTS utm_campaign            VARCHAR(200),
  ADD COLUMN IF NOT EXISTS is_recurring            BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recurring_type          crm.recurring_type,
  ADD COLUMN IF NOT EXISTS recurring_amount_monthly BIGINT,
  ADD COLUMN IF NOT EXISTS close_reason            TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at              TIMESTAMPTZ;

CREATE INDEX crm_deals_team_idx        ON crm.deals(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX crm_deals_assigned_to_idx ON crm.deals(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX crm_deals_stage_date_idx  ON crm.deals(tenant_id, stage, expected_close);
