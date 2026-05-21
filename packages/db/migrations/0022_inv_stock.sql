-- Migration 0022: IS-INV Stock & Locations (P36)
-- Adds stock location tree, stock moves, and on-hand quants to inv schema.

-- ── Enums ──────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE inv.inv_stock_location_type AS ENUM ('internal', 'external', 'virtual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE inv.inv_stock_move_state AS ENUM ('draft', 'done', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Stock Locations ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inv.stock_locations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  code       VARCHAR(32) NOT NULL,
  name       VARCHAR(128) NOT NULL,
  type       inv.inv_stock_location_type NOT NULL DEFAULT 'internal',
  parent_id  UUID REFERENCES inv.stock_locations(id) ON DELETE SET NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inv_loc_tenant_idx
  ON inv.stock_locations(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS inv_loc_tenant_code_idx
  ON inv.stock_locations(tenant_id, code);

-- ── Stock Moves ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inv.stock_moves (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  product_id       UUID NOT NULL REFERENCES inv.products(id) ON DELETE RESTRICT,
  from_location_id UUID NOT NULL REFERENCES inv.stock_locations(id) ON DELETE RESTRICT,
  to_location_id   UUID NOT NULL REFERENCES inv.stock_locations(id) ON DELETE RESTRICT,
  qty              INTEGER NOT NULL CHECK (qty > 0),
  reference        VARCHAR(128),
  notes            TEXT,
  state            inv.inv_stock_move_state NOT NULL DEFAULT 'done',
  moved_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES platform.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inv_move_tenant_idx
  ON inv.stock_moves(tenant_id);
CREATE INDEX IF NOT EXISTS inv_move_product_idx
  ON inv.stock_moves(tenant_id, product_id);
CREATE INDEX IF NOT EXISTS inv_move_moved_at_idx
  ON inv.stock_moves(tenant_id, moved_at DESC);

-- ── Stock Quants ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inv.stock_quants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES inv.products(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES inv.stock_locations(id) ON DELETE CASCADE,
  qty         INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS inv_quant_unique_idx
  ON inv.stock_quants(tenant_id, product_id, location_id);
CREATE INDEX IF NOT EXISTS inv_quant_tenant_idx
  ON inv.stock_quants(tenant_id);

-- RLS
ALTER TABLE inv.stock_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv.stock_moves     ENABLE ROW LEVEL SECURITY;
ALTER TABLE inv.stock_quants    ENABLE ROW LEVEL SECURITY;
