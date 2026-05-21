-- IS-HD v2: Configurable SLA policies, email alias, cross-module actions

-- ── SLA policies ──────────────────────────────────────────────────────────────
-- Replaces hardcoded SLA_HOURS constant.
-- Each policy has a JSONB conditions object (priority, team_id, source, tags[])
-- and response/resolution targets in minutes.
-- Policies are evaluated in priority_order ASC; first match wins.

CREATE TABLE IF NOT EXISTS hd.sla_policies (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  name                        TEXT NOT NULL,
  description                 TEXT,
  conditions                  JSONB NOT NULL DEFAULT '{}',
  -- conditions shape: { priority?: string, team_id?: uuid, source?: string, tags?: string[] }
  response_target_minutes     INTEGER NOT NULL DEFAULT 480,   -- first reply
  resolution_target_minutes   INTEGER NOT NULL DEFAULT 2880,  -- full resolve
  priority_order              INTEGER NOT NULL DEFAULT 0,     -- lower = evaluated first
  active                      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hd_sla_policies_tenant_idx ON hd.sla_policies (tenant_id, priority_order);

-- ── Email aliases (inbound ticket creation) ───────────────────────────────────
-- Each alias is a unique email address that, when receiving an email, creates
-- a ticket in the specified team.

CREATE TABLE IF NOT EXISTS hd.email_aliases (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  alias       TEXT NOT NULL,               -- e.g. "support@tenant.kantorcore.id"
  team_id     UUID REFERENCES hd.teams(id) ON DELETE SET NULL,
  auto_reply  BOOLEAN NOT NULL DEFAULT TRUE,
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT hd_email_aliases_alias_unique UNIQUE (alias)
);

CREATE INDEX IF NOT EXISTS hd_email_aliases_tenant_idx ON hd.email_aliases (tenant_id);

-- ── Ticket actions log ────────────────────────────────────────────────────────
-- Records cross-module actions taken on a ticket (create task, SO, lead, KB article, etc.)

CREATE TYPE hd.ticket_action_type AS ENUM (
  'create_task',
  'create_so',
  'create_lead',
  'create_kb_article',
  'schedule_intervention',
  'escalate',
  'merge',
  'custom'
);

CREATE TABLE IF NOT EXISTS hd.ticket_actions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  ticket_id    UUID NOT NULL REFERENCES hd.tickets(id) ON DELETE CASCADE,
  action_type  hd.ticket_action_type NOT NULL,
  actor_id     UUID REFERENCES platform.users(id) ON DELETE SET NULL,
  payload      JSONB NOT NULL DEFAULT '{}',
  -- payload contains linked entity info: { entity_id, entity_type, notes }
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hd_ticket_actions_ticket_idx ON hd.ticket_actions (ticket_id);
CREATE INDEX IF NOT EXISTS hd_ticket_actions_tenant_idx ON hd.ticket_actions (tenant_id);

-- ── Add sla_policy_id FK to tickets ──────────────────────────────────────────
ALTER TABLE hd.tickets
  ADD COLUMN IF NOT EXISTS sla_policy_id UUID REFERENCES hd.sla_policies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS first_reply_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_message_id TEXT;  -- for threading inbound emails

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE hd.sla_policies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE hd.email_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE hd.ticket_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY hd_sla_policies_service  ON hd.sla_policies  USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY hd_email_aliases_service ON hd.email_aliases USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY hd_ticket_actions_service ON hd.ticket_actions USING (TRUE) WITH CHECK (TRUE);
