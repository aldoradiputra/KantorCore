-- Migration 0026: IS-DOC — Documents & Contracts (P40)

CREATE SCHEMA IF NOT EXISTS doc;

-- ── Enums ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE doc.doc_status AS ENUM ('draft','active','expired','terminated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE doc.doc_type AS ENUM (
    'contract','nda','mou','agreement','po','invoice','permit','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Documents ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doc.documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  doc_number   VARCHAR(32) NOT NULL,
  title        VARCHAR(400) NOT NULL,
  type         doc.doc_type NOT NULL DEFAULT 'contract',
  status       doc.doc_status NOT NULL DEFAULT 'draft',
  contact_id   UUID REFERENCES platform.contacts(id) ON DELETE SET NULL,
  party_name   VARCHAR(200),
  start_date   DATE,
  expiry_date  DATE,
  value        INTEGER NOT NULL DEFAULT 0,
  file_url     TEXT,
  notes        TEXT,
  created_by   UUID REFERENCES platform.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS doc_docs_tenant_idx
  ON doc.documents(tenant_id);
CREATE INDEX IF NOT EXISTS doc_docs_tenant_status_idx
  ON doc.documents(tenant_id, status);
CREATE INDEX IF NOT EXISTS doc_docs_expiry_idx
  ON doc.documents(tenant_id, expiry_date)
  WHERE expiry_date IS NOT NULL AND status = 'active';

ALTER TABLE doc.documents ENABLE ROW LEVEL SECURITY;
