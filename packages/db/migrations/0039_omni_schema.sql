-- IS-OMNI: Omnichannel unified inbox
-- Covers: email, web live chat, WhatsApp, SMS
-- Conversations are channel-agnostic; the channel_type drives routing.

CREATE SCHEMA IF NOT EXISTS omni;

-- ── Channel types ─────────────────────────────────────────────────────────────
CREATE TYPE omni.channel_type AS ENUM ('email', 'web_chat', 'whatsapp', 'sms');

-- ── Channels (configured inboxes) ────────────────────────────────────────────
-- Each channel is one configured communication endpoint for a tenant.
-- config JSONB shape per type:
--   email:    { emailAccountId: uuid }
--   web_chat: { widgetColor: string, greeting: string, widgetToken: string }
--   whatsapp: { phoneNumberId: string, accessToken: string, verifyToken: string }
--   sms:      { fromNumber: string, accountSid: string, authToken: string }

CREATE TABLE IF NOT EXISTS omni.channels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        omni.channel_type NOT NULL,
  config      JSONB NOT NULL DEFAULT '{}',
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS omni_channels_tenant_idx ON omni.channels (tenant_id);

-- ── Conversations ─────────────────────────────────────────────────────────────
CREATE TYPE omni.conv_status AS ENUM ('open', 'pending', 'resolved', 'snoozed');

CREATE TABLE IF NOT EXISTS omni.conversations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  channel_id          UUID NOT NULL REFERENCES omni.channels(id) ON DELETE CASCADE,
  contact_id          UUID REFERENCES platform.contacts(id) ON DELETE SET NULL,
  -- Denormalised contact info (survives contact deletion / anonymous users)
  contact_name        TEXT,
  contact_identifier  TEXT,  -- email, phone, or widget session ID
  subject             TEXT,  -- meaningful for email channel
  status              omni.conv_status NOT NULL DEFAULT 'open',
  assigned_to         UUID REFERENCES platform.users(id) ON DELETE SET NULL,
  last_message_at     TIMESTAMPTZ,
  unread_count        INTEGER NOT NULL DEFAULT 0,
  message_count       INTEGER NOT NULL DEFAULT 0,
  -- Channel-specific external reference for dedup/threading
  external_ref        TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT omni_conv_ext_ref_unique UNIQUE (channel_id, external_ref)
);

CREATE INDEX IF NOT EXISTS omni_conv_tenant_idx   ON omni.conversations (tenant_id, status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS omni_conv_channel_idx  ON omni.conversations (channel_id, status);
CREATE INDEX IF NOT EXISTS omni_conv_assigned_idx ON omni.conversations (assigned_to) WHERE assigned_to IS NOT NULL;

-- ── Messages ──────────────────────────────────────────────────────────────────
CREATE TYPE omni.message_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE omni.message_content_type AS ENUM ('text', 'image', 'file', 'template', 'system');

CREATE TABLE IF NOT EXISTS omni.messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  conv_id     UUID NOT NULL REFERENCES omni.conversations(id) ON DELETE CASCADE,
  direction   omni.message_direction NOT NULL,
  content_type omni.message_content_type NOT NULL DEFAULT 'text',
  body        TEXT,
  from_name   TEXT,
  author_id   UUID REFERENCES platform.users(id) ON DELETE SET NULL,
  metadata    JSONB NOT NULL DEFAULT '{}',
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS omni_messages_conv_idx   ON omni.messages (conv_id, sent_at);
CREATE INDEX IF NOT EXISTS omni_messages_tenant_idx ON omni.messages (tenant_id);

-- ── Widget sessions (anonymous visitors) ─────────────────────────────────────
-- Created when a visitor opens the web chat widget. Linked to a conversation.

CREATE TABLE IF NOT EXISTS omni.widget_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  channel_id  UUID NOT NULL REFERENCES omni.channels(id) ON DELETE CASCADE,
  conv_id     UUID REFERENCES omni.conversations(id) ON DELETE SET NULL,
  visitor_name  TEXT,
  visitor_email TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS omni_widget_sessions_channel_idx ON omni.widget_sessions (channel_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE omni.channels         ENABLE ROW LEVEL SECURITY;
ALTER TABLE omni.conversations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE omni.messages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE omni.widget_sessions  ENABLE ROW LEVEL SECURITY;

CREATE POLICY omni_channels_service        ON omni.channels        USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY omni_conversations_service   ON omni.conversations   USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY omni_messages_service        ON omni.messages        USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY omni_widget_sessions_service ON omni.widget_sessions USING (TRUE) WITH CHECK (TRUE);
