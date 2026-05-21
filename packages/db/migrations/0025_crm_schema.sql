-- Migration 0025: IS-CRM — Sales Pipeline (P39)

CREATE SCHEMA IF NOT EXISTS crm;

-- ── Enum ──────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE crm.deal_stage AS ENUM (
    'lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Deals ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm.deals (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  deal_number        VARCHAR(32) NOT NULL,
  title              VARCHAR(300) NOT NULL,
  stage              crm.deal_stage NOT NULL DEFAULT 'lead',
  contact_id         UUID REFERENCES platform.contacts(id) ON DELETE SET NULL,
  contact_name       VARCHAR(200),
  expected_value     INTEGER NOT NULL DEFAULT 0,
  expected_close     DATE,
  notes              TEXT,
  so_id              UUID,
  assigned_to        UUID REFERENCES platform.users(id) ON DELETE SET NULL,
  created_by         UUID REFERENCES platform.users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_deals_tenant_idx
  ON crm.deals(tenant_id);
CREATE INDEX IF NOT EXISTS crm_deals_tenant_stage_idx
  ON crm.deals(tenant_id, stage);

-- ── Activities ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE crm.activity_type AS ENUM ('note','call','email','meeting');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS crm.activities (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  deal_id    UUID NOT NULL REFERENCES crm.deals(id) ON DELETE CASCADE,
  type       crm.activity_type NOT NULL DEFAULT 'note',
  title      VARCHAR(300) NOT NULL,
  notes      TEXT,
  done_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES platform.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS crm_act_deal_idx ON crm.activities(deal_id);

ALTER TABLE crm.deals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.activities ENABLE ROW LEVEL SECURITY;
