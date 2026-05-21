-- Migration 0021: IS-INV — Product Catalog (P35)
-- Creates inv schema with product_categories, uom, products tables.

CREATE SCHEMA IF NOT EXISTS inv;

-- ── Enum ──────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE inv.inv_product_type AS ENUM ('product', 'service', 'consumable');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Product Categories ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inv.product_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  name        VARCHAR(128) NOT NULL,
  description TEXT,
  parent_id   UUID REFERENCES inv.product_categories(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inv_cat_tenant_idx
  ON inv.product_categories(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS inv_cat_tenant_name_idx
  ON inv.product_categories(tenant_id, name);

-- ── Units of Measure ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inv.uom (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  name       VARCHAR(64) NOT NULL,
  symbol     VARCHAR(16),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inv_uom_tenant_idx
  ON inv.uom(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS inv_uom_tenant_name_idx
  ON inv.uom(tenant_id, name);

-- ── Products ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inv.products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  code        VARCHAR(64),
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  type        inv.inv_product_type NOT NULL DEFAULT 'product',
  category_id UUID REFERENCES inv.product_categories(id) ON DELETE SET NULL,
  uom_id      UUID REFERENCES inv.uom(id) ON DELETE SET NULL,

  -- Pricing in IDR (integer, no decimals)
  sale_price  INTEGER NOT NULL DEFAULT 0,
  cost_price  INTEGER NOT NULL DEFAULT 0,

  -- Default GL accounts (nullable — resolved via CoA seeding)
  revenue_account_id UUID REFERENCES fin.accounts(id) ON DELETE SET NULL,
  expense_account_id UUID REFERENCES fin.accounts(id) ON DELETE SET NULL,

  -- Default tax ID arrays (UUIDs serialized as text[])
  default_sale_tax_ids     TEXT[] NOT NULL DEFAULT '{}',
  default_purchase_tax_ids TEXT[] NOT NULL DEFAULT '{}',

  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inv_prod_tenant_idx
  ON inv.products(tenant_id);
CREATE INDEX IF NOT EXISTS inv_prod_tenant_active_idx
  ON inv.products(tenant_id, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS inv_prod_tenant_code_idx
  ON inv.products(tenant_id, code)
  WHERE code IS NOT NULL;

-- RLS consistent with other schemas
ALTER TABLE inv.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv.uom                ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv.products           ENABLE ROW LEVEL SECURITY;
