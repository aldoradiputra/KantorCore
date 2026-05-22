-- IS-CHATTER: Polymorphic record-level communications
-- Covers internal notes, outbound emails, and scheduled activities
-- across any entity type (hd.ticket, crm.deal, fin.invoice, etc.)

CREATE TABLE IF NOT EXISTS platform.record_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,

  -- Polymorphic entity reference
  entity_type       TEXT NOT NULL,  -- e.g. 'hd.ticket', 'crm.deal', 'fin.invoice'
  entity_id         UUID NOT NULL,

  -- Event classification
  event_type        TEXT NOT NULL,  -- 'log_note' | 'send_email' | 'activity_scheduled' | 'activity_done'
  is_internal       BOOLEAN NOT NULL DEFAULT TRUE,

  -- Message content
  subject           TEXT,
  body              TEXT,
  body_html         TEXT,

  -- Authorship
  author_user_id    UUID REFERENCES platform.users(id) ON DELETE SET NULL,
  author_name       TEXT NOT NULL DEFAULT '',  -- denormalised, survives user deletion

  -- Email-specific fields
  to_addrs          TEXT[]  NOT NULL DEFAULT '{}',
  cc_addrs          TEXT[]  NOT NULL DEFAULT '{}',
  email_message_id  TEXT,    -- RFC 5322 Message-ID for IS-EMAIL threading

  -- Activity-specific fields
  activity_type     TEXT,          -- 'call' | 'meeting' | 'todo' | 'email' | 'deadline'
  activity_due      TIMESTAMPTZ,
  activity_done_at  TIMESTAMPTZ,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS record_events_entity_idx
  ON platform.record_events (tenant_id, entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS record_events_author_idx
  ON platform.record_events (author_user_id) WHERE author_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS record_events_activity_due_idx
  ON platform.record_events (tenant_id, activity_due)
  WHERE event_type = 'activity_scheduled' AND activity_done_at IS NULL;

ALTER TABLE platform.record_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY record_events_service ON platform.record_events USING (TRUE) WITH CHECK (TRUE);
