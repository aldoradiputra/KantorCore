-- Migration 0027: IS-MIG — Data Import (P42)

CREATE SCHEMA IF NOT EXISTS mig;

DO $$ BEGIN
  CREATE TYPE mig.import_entity AS ENUM (
    'contacts','products','accounts','vendors'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE mig.import_status AS ENUM (
    'pending','done','failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS mig.import_jobs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  entity       mig.import_entity NOT NULL,
  status       mig.import_status NOT NULL DEFAULT 'pending',
  total_rows   INTEGER NOT NULL DEFAULT 0,
  imported     INTEGER NOT NULL DEFAULT 0,
  failed       INTEGER NOT NULL DEFAULT 0,
  errors       JSONB NOT NULL DEFAULT '[]',
  created_by   UUID REFERENCES platform.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mig_jobs_tenant_idx ON mig.import_jobs(tenant_id);

ALTER TABLE mig.import_jobs ENABLE ROW LEVEL SECURITY;
