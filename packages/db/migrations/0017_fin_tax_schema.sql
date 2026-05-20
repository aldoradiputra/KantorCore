-- Migration 0017: IS-FIN Tax Objects (Phase 28)
-- Adds tax groups, taxes, and per-line junctions.
-- Forward-only. All objects guarded.

-- Enums
DO $$ BEGIN
  CREATE TYPE fin_tax_scope AS ENUM ('sale', 'purchase');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE fin_tax_amount_type AS ENUM ('percent', 'fixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tax Groups
CREATE TABLE IF NOT EXISTS fin.tax_groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  name        varchar(80) NOT NULL,
  sequence    integer NOT NULL DEFAULT 10,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fin_taxgrp_tenant_name_uniq UNIQUE (tenant_id, name)
);

-- Taxes
CREATE TABLE IF NOT EXISTS fin.taxes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  name            varchar(120) NOT NULL,
  scope           fin_tax_scope NOT NULL,
  amount_type     fin_tax_amount_type NOT NULL DEFAULT 'percent',
  amount          bigint NOT NULL CHECK (amount >= 0),
  tax_account_id  uuid NOT NULL REFERENCES fin.accounts(id) ON DELETE RESTRICT,
  group_id        uuid REFERENCES fin.tax_groups(id) ON DELETE SET NULL,
  price_include   boolean NOT NULL DEFAULT false,
  is_active       boolean NOT NULL DEFAULT true,
  sequence        integer NOT NULL DEFAULT 10,
  description     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fin_tax_tenant_name_uniq UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS fin_tax_tenant_scope_idx ON fin.taxes (tenant_id, scope);

-- Invoice Line ↔ Tax junction
CREATE TABLE IF NOT EXISTS fin.invoice_line_taxes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  invoice_line_id  uuid NOT NULL REFERENCES fin.invoice_lines(id) ON DELETE CASCADE,
  tax_id           uuid NOT NULL REFERENCES fin.taxes(id) ON DELETE RESTRICT,
  CONSTRAINT fin_invltax_line_tax_uniq UNIQUE (invoice_line_id, tax_id)
);

CREATE INDEX IF NOT EXISTS fin_invltax_line_idx ON fin.invoice_line_taxes (invoice_line_id);

-- Bill Line ↔ Tax junction
CREATE TABLE IF NOT EXISTS fin.bill_line_taxes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  bill_line_id  uuid NOT NULL REFERENCES fin.bill_lines(id) ON DELETE CASCADE,
  tax_id        uuid NOT NULL REFERENCES fin.taxes(id) ON DELETE RESTRICT,
  CONSTRAINT fin_billltax_line_tax_uniq UNIQUE (bill_line_id, tax_id)
);

CREATE INDEX IF NOT EXISTS fin_billltax_line_idx ON fin.bill_line_taxes (bill_line_id);

-- Display mode on header docs (default summary-below).
ALTER TABLE fin.invoices ADD COLUMN IF NOT EXISTS display_tax_inline boolean NOT NULL DEFAULT false;
ALTER TABLE fin.bills    ADD COLUMN IF NOT EXISTS display_tax_inline boolean NOT NULL DEFAULT false;

-- RLS
ALTER TABLE fin.tax_groups         ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin.taxes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin.invoice_line_taxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fin.bill_line_taxes    ENABLE ROW LEVEL SECURITY;
