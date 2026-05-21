-- IS-PORTAL: External customer/vendor portal access
-- Migration 0031

CREATE SCHEMA IF NOT EXISTS portal;

-- Portal access flags on contacts
ALTER TABLE platform.contacts
  ADD COLUMN IF NOT EXISTS portal_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS portal_last_login TIMESTAMPTZ;

-- Magic link tokens
CREATE TABLE IF NOT EXISTS portal.magic_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  contact_id  UUID NOT NULL REFERENCES platform.contacts(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,             -- SHA-256 hex of the random token
  expires_at  TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(token_hash)
);

CREATE INDEX IF NOT EXISTS portal_magic_links_contact ON portal.magic_links(contact_id);
CREATE INDEX IF NOT EXISTS portal_magic_links_expires ON portal.magic_links(expires_at);

-- Portal sessions (cookie-backed, separate from internal user sessions)
CREATE TABLE IF NOT EXISTS portal.sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  contact_id  UUID NOT NULL REFERENCES platform.contacts(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,             -- SHA-256 of the session cookie value
  expires_at  TIMESTAMPTZ NOT NULL,
  user_agent  TEXT,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(token_hash)
);

CREATE INDEX IF NOT EXISTS portal_sessions_contact ON portal.sessions(contact_id);
CREATE INDEX IF NOT EXISTS portal_sessions_expires ON portal.sessions(expires_at);

-- Note: magic_links + sessions intentionally NOT RLS'd — they are looked up
-- by token BEFORE we know the tenant. Tenant resolution happens via the row's
-- tenant_id, and downstream queries set app.tenant_id from that.
