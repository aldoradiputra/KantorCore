-- Migration 0023: IS-PROC — Purchase Orders (P37)

CREATE SCHEMA IF NOT EXISTS proc;

-- ── Enum ──────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE proc.proc_po_status AS ENUM ('draft','confirmed','received','billed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Purchase Orders ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proc.purchase_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  po_number     VARCHAR(32) NOT NULL,
  status        proc.proc_po_status NOT NULL DEFAULT 'draft',
  contact_id    UUID REFERENCES platform.contacts(id) ON DELETE SET NULL,
  vendor_name   VARCHAR(200) NOT NULL,
  date          DATE NOT NULL,
  expected_date DATE,
  notes         TEXT,
  bill_id       UUID,
  created_by    UUID REFERENCES platform.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS proc_po_tenant_idx
  ON proc.purchase_orders(tenant_id);
CREATE INDEX IF NOT EXISTS proc_po_tenant_status_idx
  ON proc.purchase_orders(tenant_id, status);

-- ── PO Lines ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proc.po_lines (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  po_id        UUID NOT NULL REFERENCES proc.purchase_orders(id) ON DELETE CASCADE,
  product_id   UUID REFERENCES inv.products(id) ON DELETE SET NULL,
  product_type VARCHAR(20),
  description  VARCHAR(500) NOT NULL,
  qty          INTEGER NOT NULL,
  unit_price   INTEGER NOT NULL,
  account_id   UUID REFERENCES fin.accounts(id) ON DELETE SET NULL,
  tax_ids      TEXT[] NOT NULL DEFAULT '{}',
  received_qty INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS proc_pol_po_idx ON proc.po_lines(po_id);

ALTER TABLE proc.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE proc.po_lines        ENABLE ROW LEVEL SECURITY;
