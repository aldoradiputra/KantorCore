-- IS-TRIG: Event Trigger rules (tenant-scoped)
-- Each rule watches a specific event and, when matched, sends a chat
-- message or calls a webhook. Execution is fire-and-forget via the app layer.

CREATE SCHEMA IF NOT EXISTS trig;

DO $$ BEGIN
  CREATE TYPE trig.trigger_event AS ENUM (
    'invoice.confirmed',
    'invoice.paid',
    'bill.confirmed',
    'bill.paid',
    'po.confirmed',
    'po.received',
    'so.confirmed',
    'so.done',
    'deal.won',
    'deal.lost',
    'deal.stage_changed',
    'contact.created',
    'employee.created',
    'document.expiring_soon',
    'import.completed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE trig.trigger_action AS ENUM (
    'chat_message',
    'webhook'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE trig.trigger_status AS ENUM (
    'active',
    'inactive'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS trig.trigger_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  event       trig.trigger_event NOT NULL,
  action      trig.trigger_action NOT NULL,
  -- For chat_message: { channel_slug, template }
  -- For webhook: { url, secret?, method? }
  config      JSONB NOT NULL DEFAULT '{}',
  status      trig.trigger_status NOT NULL DEFAULT 'active',
  created_by  UUID REFERENCES public.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trig_rules_tenant_event_idx
  ON trig.trigger_rules (tenant_id, event, status);

CREATE TABLE IF NOT EXISTS trig.trigger_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rule_id     UUID NOT NULL REFERENCES trig.trigger_rules(id) ON DELETE CASCADE,
  event       trig.trigger_event NOT NULL,
  payload     JSONB,
  ok          BOOLEAN NOT NULL,
  response    TEXT,
  fired_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trig_logs_tenant_rule_idx
  ON trig.trigger_logs (tenant_id, rule_id, fired_at DESC);

ALTER TABLE trig.trigger_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE trig.trigger_logs  ENABLE ROW LEVEL SECURITY;
