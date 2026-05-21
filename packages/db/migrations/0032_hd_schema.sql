-- IS-HD: Help Desk
-- Migration 0032

CREATE SCHEMA IF NOT EXISTS hd;

DO $$ BEGIN
  CREATE TYPE hd.ticket_status AS ENUM (
    'new', 'open', 'pending', 'resolved', 'closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE hd.ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE hd.ticket_source AS ENUM (
    'portal', 'email', 'chat', 'phone', 'manual'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Teams ──────────────────────────────────────────────────────────────────────
-- Support teams that handle tickets (e.g. "Tier-1", "Billing", "Technical")

CREATE TABLE IF NOT EXISTS hd.teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hd_teams_tenant_idx ON hd.teams(tenant_id);

-- ── Team Members ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hd.team_members (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  team_id   UUID NOT NULL REFERENCES hd.teams(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES platform.users(id) ON DELETE CASCADE,
  UNIQUE(team_id, user_id)
);

CREATE INDEX IF NOT EXISTS hd_team_members_team_idx ON hd.team_members(team_id);
CREATE INDEX IF NOT EXISTS hd_team_members_user_idx ON hd.team_members(user_id);

-- ── Tickets ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hd.tickets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  ticket_number VARCHAR(32) NOT NULL,
  subject       TEXT NOT NULL,
  status        hd.ticket_status NOT NULL DEFAULT 'new',
  priority      hd.ticket_priority NOT NULL DEFAULT 'medium',
  source        hd.ticket_source NOT NULL DEFAULT 'manual',
  -- Reporter (external contact OR internal user, at least one set)
  contact_id    UUID REFERENCES platform.contacts(id) ON DELETE SET NULL,
  reporter_name TEXT,
  reporter_email TEXT,
  -- Assignment
  team_id       UUID REFERENCES hd.teams(id) ON DELETE SET NULL,
  assignee_id   UUID REFERENCES platform.users(id) ON DELETE SET NULL,
  -- Metadata
  tags          TEXT[],
  closed_at     TIMESTAMPTZ,
  first_reply_at TIMESTAMPTZ,
  sla_due_at    TIMESTAMPTZ,     -- computed from priority + SLA policy
  created_by    UUID REFERENCES platform.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hd_tickets_tenant_idx        ON hd.tickets(tenant_id);
CREATE INDEX IF NOT EXISTS hd_tickets_tenant_status_idx ON hd.tickets(tenant_id, status);
CREATE INDEX IF NOT EXISTS hd_tickets_assignee_idx      ON hd.tickets(assignee_id);
CREATE INDEX IF NOT EXISTS hd_tickets_contact_idx       ON hd.tickets(contact_id);

-- Auto-increment sequence for ticket numbers per tenant
CREATE SEQUENCE IF NOT EXISTS hd.ticket_seq START 1000 INCREMENT 1;

-- ── Ticket Messages ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hd.ticket_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  ticket_id   UUID NOT NULL REFERENCES hd.tickets(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  -- Author: internal user OR portal contact
  author_user_id    UUID REFERENCES platform.users(id) ON DELETE SET NULL,
  author_contact_id UUID REFERENCES platform.contacts(id) ON DELETE SET NULL,
  author_name       TEXT NOT NULL,          -- denormalized for display
  is_internal       BOOLEAN NOT NULL DEFAULT false,  -- internal notes, hidden from portal
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hd_messages_ticket_idx  ON hd.ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS hd_messages_tenant_idx  ON hd.ticket_messages(tenant_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE hd.teams          ENABLE ROW LEVEL SECURITY;
ALTER TABLE hd.team_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE hd.tickets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE hd.ticket_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY hd_teams_isolation         ON hd.teams
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  CREATE POLICY hd_team_members_isolation  ON hd.team_members
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  CREATE POLICY hd_tickets_isolation       ON hd.tickets
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  CREATE POLICY hd_messages_isolation      ON hd.ticket_messages
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
