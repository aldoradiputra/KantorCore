-- IS-EMAIL: Shared team inboxes (lightweight Front-style collaboration on non-support email)

CREATE SCHEMA IF NOT EXISTS email;

-- ── Connected email accounts (shared inboxes) ────────────────────────────────
-- Each row is one IMAP+SMTP-connected mailbox the team collaborates on.
-- Credentials are stored encrypted at the application layer.

CREATE TABLE IF NOT EXISTS email.accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,                  -- "Sales", "Info", "Partners"
  address         TEXT NOT NULL,                  -- sales@kantorcore.id
  imap_host       TEXT NOT NULL,
  imap_port       INTEGER NOT NULL DEFAULT 993,
  imap_secure     BOOLEAN NOT NULL DEFAULT TRUE,
  imap_user       TEXT NOT NULL,
  imap_password   TEXT NOT NULL,                  -- encrypted (app-layer)
  smtp_host       TEXT NOT NULL,
  smtp_port       INTEGER NOT NULL DEFAULT 465,
  smtp_secure     BOOLEAN NOT NULL DEFAULT TRUE,
  smtp_user       TEXT NOT NULL,
  smtp_password   TEXT NOT NULL,                  -- encrypted (app-layer)
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  last_sync_at    TIMESTAMPTZ,
  last_sync_error TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT email_accounts_address_unique UNIQUE (tenant_id, address)
);

CREATE INDEX IF NOT EXISTS email_accounts_tenant_idx ON email.accounts (tenant_id);

-- ── Threads (derived; one per conversation) ──────────────────────────────────

CREATE TYPE email.thread_status AS ENUM ('open', 'snoozed', 'closed');

CREATE TABLE IF NOT EXISTS email.threads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  account_id      UUID NOT NULL REFERENCES email.accounts(id) ON DELETE CASCADE,
  subject         TEXT,
  status          email.thread_status NOT NULL DEFAULT 'open',
  assigned_to     UUID REFERENCES platform.users(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ,
  contact_id      UUID REFERENCES platform.contacts(id) ON DELETE SET NULL,
  unread_count    INTEGER NOT NULL DEFAULT 0,
  message_count   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_threads_account_idx ON email.threads (account_id, status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS email_threads_tenant_idx ON email.threads (tenant_id);
CREATE INDEX IF NOT EXISTS email_threads_assigned_idx ON email.threads (assigned_to) WHERE assigned_to IS NOT NULL;

-- ── Messages ─────────────────────────────────────────────────────────────────

CREATE TYPE email.message_direction AS ENUM ('inbound', 'outbound');

CREATE TABLE IF NOT EXISTS email.messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  account_id      UUID NOT NULL REFERENCES email.accounts(id) ON DELETE CASCADE,
  thread_id       UUID NOT NULL REFERENCES email.threads(id) ON DELETE CASCADE,
  message_id      TEXT,                            -- RFC 5322 Message-ID header (unique within account)
  in_reply_to     TEXT,                            -- RFC 5322 In-Reply-To
  refs            TEXT,                            -- RFC 5322 References (space-separated)
  direction       email.message_direction NOT NULL,
  from_addr       TEXT NOT NULL,
  from_name       TEXT,
  to_addrs        TEXT[] NOT NULL DEFAULT '{}',
  cc_addrs        TEXT[] NOT NULL DEFAULT '{}',
  subject         TEXT,
  body_text       TEXT,
  body_html       TEXT,
  snippet         TEXT,                            -- first ~140 chars for list view
  sent_at         TIMESTAMPTZ NOT NULL,
  imap_uid        BIGINT,                          -- IMAP UID for dedupe
  read            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT email_messages_msgid_unique UNIQUE (account_id, message_id)
);

CREATE INDEX IF NOT EXISTS email_messages_thread_idx ON email.messages (thread_id, sent_at);
CREATE INDEX IF NOT EXISTS email_messages_tenant_idx ON email.messages (tenant_id);
CREATE INDEX IF NOT EXISTS email_messages_inreplyto_idx ON email.messages (in_reply_to) WHERE in_reply_to IS NOT NULL;

-- ── Attachments ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email.attachments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  message_id   UUID NOT NULL REFERENCES email.messages(id) ON DELETE CASCADE,
  filename     TEXT NOT NULL,
  content_type TEXT,
  size_bytes   INTEGER,
  storage_key  TEXT,                                -- object storage key (future)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_attachments_message_idx ON email.attachments (message_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE email.accounts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE email.threads     ENABLE ROW LEVEL SECURITY;
ALTER TABLE email.messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE email.attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_accounts_service    ON email.accounts    USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY email_threads_service     ON email.threads     USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY email_messages_service    ON email.messages    USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY email_attachments_service ON email.attachments USING (TRUE) WITH CHECK (TRUE);
